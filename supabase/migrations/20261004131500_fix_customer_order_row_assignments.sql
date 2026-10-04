-- Fix composite-row assignments in the authoritative customer order RPC.
-- SELECT sp/p assigns a single composite value to the first UUID field of a %rowtype variable.
create or replace function public.create_customer_order(
  p_store_id uuid,
  p_items jsonb,
  p_address_id uuid,
  p_payment_method public.payment_method,
  p_online_payment_method public.online_payment_method default null,
  p_customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_address public.addresses%rowtype;
  v_store public.stores%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_store_product public.store_products%rowtype;
  v_product public.products%rowtype;
  v_inventory public.inventory%rowtype;
  v_quantity integer;
  v_line_total numeric(12, 2);
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_delivery_fee numeric(12, 2) := coalesce((select (value ->> 'delivery_fee')::numeric from public.platform_settings where key = 'commercial_fees'), 0);
  v_service_fee numeric(12, 2) := coalesce((select (value ->> 'customer_service_fee')::numeric from public.platform_settings where key = 'commercial_fees'), 0);
  v_total numeric(12, 2);
  v_order_status public.order_status;
  v_snapshot jsonb;
begin
  if v_customer_id is null then raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception using errcode = 'P0001', message = 'CART_EMPTY'; end if;
  if p_payment_method = 'ONLINE' and p_online_payment_method is null then raise exception using errcode = 'P0001', message = 'ONLINE_METHOD_REQUIRED'; end if;
  if p_payment_method = 'COD' and p_online_payment_method is not null then raise exception using errcode = 'P0001', message = 'COD_CANNOT_HAVE_ONLINE_METHOD'; end if;
  select * into v_address from public.addresses where id = p_address_id and customer_id = v_customer_id;
  if not found then raise exception using errcode = 'P0001', message = 'ADDRESS_NOT_FOUND'; end if;
  select * into v_store from public.stores where id = p_store_id and is_active and is_open and operational_available;
  if not found then raise exception using errcode = 'P0001', message = 'STORE_NOT_AVAILABLE'; end if;
  v_snapshot := jsonb_build_object('id', v_address.id, 'label', v_address.label, 'address_line', v_address.address_line, 'area', v_address.area, 'city', v_address.city, 'location', v_address.location);
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item -> 'storeProductId') <> 'string' or jsonb_typeof(v_item -> 'quantity') <> 'number' then raise exception using errcode = 'P0001', message = 'INVALID_CART_ITEM'; end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 or (v_item ->> 'quantity')::numeric <> v_quantity then raise exception using errcode = 'P0001', message = 'INVALID_QUANTITY'; end if;
    select sp.* into v_store_product from public.store_products sp join public.products p on p.id = sp.product_id where sp.id = (v_item ->> 'storeProductId')::uuid and sp.store_id = p_store_id and sp.is_active;
    if not found then raise exception using errcode = 'P0001', message = 'INVALID_STORE_PRODUCT'; end if;
    select * into v_inventory from public.inventory where store_id = p_store_id and product_id = v_store_product.product_id for update;
    if not found or v_inventory.status <> 'AVAILABLE' then raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE'; end if;
    if v_inventory.quantity is not null and v_inventory.quantity < v_quantity then raise exception using errcode = 'P0001', message = 'INSUFFICIENT_INVENTORY'; end if;
    v_line_total := public.calculate_effective_store_product_line_total(v_store_product.id, v_quantity);
    v_subtotal := v_subtotal + v_line_total;
  end loop;
  v_total := v_subtotal + v_delivery_fee + v_service_fee;
  v_order_status := case when p_payment_method = 'ONLINE' then 'PAYMENT_PENDING' else 'FINDING_STORE' end;
  insert into public.orders (customer_id, store_id, status, payment_method, online_payment_method, fallback_allowed, max_fallback_price_difference, subtotal, delivery_fee, service_fee, total, delivery_address_snapshot, customer_note)
  values (v_customer_id, p_store_id, v_order_status, p_payment_method, p_online_payment_method, false, 0, v_subtotal, v_delivery_fee, v_service_fee, v_total, v_snapshot, nullif(trim(p_customer_note), '')) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select sp.* into v_store_product from public.store_products sp join public.products p on p.id = sp.product_id where sp.id = (v_item ->> 'storeProductId')::uuid and sp.store_id = p_store_id;
    select p.* into v_product from public.products p where p.id = v_store_product.product_id;
    v_line_total := public.calculate_effective_store_product_line_total(v_store_product.id, v_quantity);
    v_unit_price := round(v_line_total / v_quantity, 2);
    insert into public.order_items (order_id, store_product_id, product_name_snapshot, unit_price, quantity, line_total) values (v_order_id, v_store_product.id, v_product.name, v_unit_price, v_quantity, v_line_total);
    update public.inventory
    set quantity = quantity - v_quantity, updated_by = v_customer_id, last_updated_at = now()
    where store_id = p_store_id and product_id = v_store_product.product_id and status = 'AVAILABLE' and quantity is not null and quantity >= v_quantity;
    if not found and exists (select 1 from public.inventory where store_id = p_store_id and product_id = v_store_product.product_id and quantity is not null) then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_INVENTORY';
    end if;
  end loop;
  insert into public.payments (order_id, method, online_method, amount, status) values (v_order_id, p_payment_method, p_online_payment_method, v_total, 'PENDING');
  insert into public.payment_events (payment_id, event_type, amount, metadata) select id, 'PAYMENT_INITIALIZED', v_total, jsonb_build_object('method', p_payment_method::text) from public.payments where order_id = v_order_id;
  return v_order_id;
end;
$$;
revoke execute on function public.create_customer_order(uuid, jsonb, uuid, public.payment_method, public.online_payment_method, text) from public, anon;
grant execute on function public.create_customer_order(uuid, jsonb, uuid, public.payment_method, public.online_payment_method, text) to authenticated;

