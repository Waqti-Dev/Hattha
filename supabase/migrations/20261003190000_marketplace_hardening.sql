-- Hattha marketplace hardening.
-- No seed, demo, fake, or sample data is inserted.

create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  store_product_id uuid references public.store_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_favorites_one_target check ((case when store_id is not null then 1 else 0 end) + (case when store_product_id is not null then 1 else 0 end) = 1)
);

create unique index if not exists customer_favorites_store_unique
  on public.customer_favorites(customer_id, store_id) where store_id is not null;
create unique index if not exists customer_favorites_product_unique
  on public.customer_favorites(customer_id, store_product_id) where store_product_id is not null;
create index if not exists customer_favorites_customer_idx on public.customer_favorites(customer_id, created_at desc);

alter table public.customer_favorites enable row level security;
drop policy if exists customer_favorites_self_manage on public.customer_favorites;
create policy customer_favorites_self_manage on public.customer_favorites
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Orders and order items must be created only by the authoritative order RPC.
-- Direct authenticated inserts would allow client-controlled totals or snapshots.
drop policy if exists orders_customer_insert on public.orders;
drop policy if exists order_items_customer_insert on public.order_items;

create or replace function public.get_merchant_order_fulfillment(p_order_id uuid)
returns table(order_id uuid, customer_name text, customer_phone text, delivery_address jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('MERCHANT') then
    raise exception using errcode = 'P0001', message = 'MERCHANT_AUTHENTICATION_REQUIRED';
  end if;
  return query
  select o.id, p.full_name, p.phone, o.delivery_address_snapshot
  from public.orders o
  join public.profiles p on p.id = o.customer_id
  where o.id = p_order_id
    and o.store_id is not null
    and public.is_store_staff(o.store_id);
end;
$$;
revoke execute on function public.get_merchant_order_fulfillment(uuid) from public, anon;
grant execute on function public.get_merchant_order_fulfillment(uuid) to authenticated;

create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.store_id is not null and (new.payment_method = 'COD' or new.status not in ('PAYMENT_PENDING', 'WAITING_PAYMENT_CONFIRMATION')) then
    insert into public.notifications(recipient_id, order_id, event_type, title, body)
    select ss.user_id, new.id, 'NEW_ORDER', 'طلب جديد من عميل',
      'لديك طلب جديد رقم #' || left(new.id::text, 8) || ' يحتاج إلى مراجعة.'
    from public.store_staff ss
    where ss.store_id = new.store_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_store_staff on public.orders;
create trigger orders_notify_store_staff
after insert on public.orders
for each row execute function public.notify_new_order();

create or replace function public.ensure_delivery_for_ready_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pickup jsonb;
  v_earnings numeric(12, 2);
begin
  if new.status = 'READY_FOR_PICKUP' and old.status is distinct from new.status and new.store_id is not null then
    select jsonb_build_object('store_id', s.id, 'store_name', s.name, 'address', s.address, 'phone', s.phone),
      coalesce((select (value ->> 'courier_earnings')::numeric from public.platform_settings where key = 'commercial_fees'), 0)
    into v_pickup, v_earnings
    from public.stores s where s.id = new.store_id;
    insert into public.deliveries(order_id, pickup_location, delivery_location, amount_to_collect, courier_earnings)
    values (
      new.id,
      coalesce(v_pickup, '{}'::jsonb),
      coalesce(new.delivery_address_snapshot, '{}'::jsonb),
      case when new.payment_method = 'COD' then new.total else 0 end,
      coalesce(v_earnings, 0)
    ) on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_create_delivery_on_ready on public.orders;
create trigger orders_create_delivery_on_ready
after update of status on public.orders
for each row execute function public.ensure_delivery_for_ready_order();

create or replace function public.courier_set_availability(p_is_available boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('COURIER') then
    raise exception using errcode = 'P0001', message = 'COURIER_AUTHENTICATION_REQUIRED';
  end if;
  if not exists (select 1 from public.couriers where id = auth.uid() and verification_status = 'VERIFIED') then
    raise exception using errcode = 'P0001', message = 'COURIER_NOT_VERIFIED';
  end if;
  update public.couriers set is_available = p_is_available where id = auth.uid();
  return p_is_available;
end;
$$;

create or replace function public.courier_list_delivery_jobs()
returns table(
  id uuid,
  order_id uuid,
  delivery_status public.delivery_status,
  order_status public.order_status,
  store_name text,
  pickup_location jsonb,
  delivery_location jsonb,
  amount_to_collect numeric(12, 2),
  courier_earnings numeric(12, 2),
  created_at timestamptz,
  customer_name text,
  customer_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('COURIER') then
    raise exception using errcode = 'P0001', message = 'COURIER_AUTHENTICATION_REQUIRED';
  end if;
  if not exists (select 1 from public.couriers where id = auth.uid() and verification_status = 'VERIFIED') then
    raise exception using errcode = 'P0001', message = 'COURIER_NOT_VERIFIED';
  end if;
  return query
  select d.id, d.order_id, d.status, o.status, s.name, d.pickup_location, d.delivery_location,
    d.amount_to_collect, d.courier_earnings, d.created_at, p.full_name, p.phone
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  join public.stores s on s.id = o.store_id
  join public.profiles p on p.id = o.customer_id
  where (d.courier_id = auth.uid() and d.status <> 'DELIVERED')
     or (d.courier_id is null and d.status = 'OFFERED' and o.status = 'READY_FOR_PICKUP')
  order by d.created_at desc;
end;
$$;

create or replace function public.courier_claim_delivery(p_delivery_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_order_id uuid;
begin
  if auth.uid() is null or not public.has_role('COURIER') then
    raise exception using errcode = 'P0001', message = 'COURIER_AUTHENTICATION_REQUIRED';
  end if;
  if not exists (select 1 from public.couriers where id = auth.uid() and verification_status = 'VERIFIED' and is_available) then
    raise exception using errcode = 'P0001', message = 'COURIER_NOT_AVAILABLE';
  end if;
  update public.deliveries
  set courier_id = auth.uid(), status = 'ASSIGNED', assigned_at = now()
  where id = p_delivery_id and courier_id is null and status = 'OFFERED'
    and exists (select 1 from public.orders o where o.id = public.deliveries.order_id and o.status = 'READY_FOR_PICKUP')
  returning order_id into v_order_id;
  if v_order_id is null then raise exception using errcode = 'P0001', message = 'DELIVERY_NOT_AVAILABLE'; end if;
  update public.couriers set is_available = false where id = auth.uid();
  update public.orders set status = 'COURIER_ASSIGNED' where id = v_order_id and status = 'READY_FOR_PICKUP';
  insert into public.notifications(recipient_id, order_id, event_type, title, body)
  select customer_id, id, 'DELIVERY_STATUS_CHANGED', 'تم تعيين مندوب لطلبك', 'تم تعيين مندوب لتوصيل طلبك.'
  from public.orders where id = v_order_id;
  return v_order_id;
end;
$$;

create or replace function public.courier_decline_delivery(p_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('COURIER') then
    raise exception using errcode = 'P0001', message = 'COURIER_AUTHENTICATION_REQUIRED';
  end if;
  update public.deliveries set courier_id = null, status = 'OFFERED', assigned_at = null
  where id = p_delivery_id and courier_id = auth.uid() and status = 'ASSIGNED';
  if not found then raise exception using errcode = 'P0001', message = 'DELIVERY_DECLINE_NOT_ALLOWED'; end if;
  update public.couriers set is_available = true where id = auth.uid();
  return true;
end;
$$;

create or replace function public.courier_update_delivery(p_delivery_id uuid, p_action text)
returns public.delivery_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_delivery_status public.delivery_status;
  v_order_status public.order_status;
  v_title text;
  v_body text;
begin
  if auth.uid() is null or not public.has_role('COURIER') then
    raise exception using errcode = 'P0001', message = 'COURIER_AUTHENTICATION_REQUIRED';
  end if;
  select * into v_delivery from public.deliveries where id = p_delivery_id and courier_id = auth.uid() for update;
  if not found then raise exception using errcode = 'P0001', message = 'DELIVERY_NOT_FOUND'; end if;
  if p_action = 'GOING_TO_STORE' and v_delivery.status = 'ASSIGNED' then
    v_delivery_status := 'GOING_TO_STORE'; v_order_status := 'COURIER_GOING_TO_STORE'; v_title := 'المندوب في الطريق إلى المتجر'; v_body := 'المندوب في طريقه لاستلام طلبك.';
  elsif p_action = 'AT_STORE' and v_delivery.status = 'GOING_TO_STORE' then
    v_delivery_status := 'AT_STORE'; v_order_status := 'COURIER_AT_STORE'; v_title := 'المندوب وصل إلى المتجر'; v_body := 'وصل المندوب إلى المتجر.';
  elsif p_action = 'PICKUP' and v_delivery.status = 'AT_STORE' then
    v_delivery_status := 'PICKED_UP'; v_order_status := 'PICKED_UP'; v_title := 'تم استلام طلبك'; v_body := 'استلم المندوب طلبك من المتجر.';
  elsif p_action = 'GO_TO_CUSTOMER' and v_delivery.status = 'PICKED_UP' then
    v_delivery_status := 'GOING_TO_CUSTOMER'; v_order_status := 'COURIER_GOING_TO_CUSTOMER'; v_title := 'المندوب في الطريق إليك'; v_body := 'طلبك في الطريق إليك.';
  elsif p_action = 'ARRIVED' and v_delivery.status = 'GOING_TO_CUSTOMER' then
    v_delivery_status := 'AT_CUSTOMER'; v_order_status := 'COURIER_AT_CUSTOMER'; v_title := 'وصل المندوب'; v_body := 'وصل المندوب. راجع طلبك ثم أكد الاستلام.';
  else
    raise exception using errcode = 'P0001', message = 'INVALID_DELIVERY_TRANSITION';
  end if;
  update public.deliveries set status = v_delivery_status where id = v_delivery.id;
  update public.orders set status = v_order_status where id = v_delivery.order_id;
  insert into public.notifications(recipient_id, order_id, event_type, title, body)
  select customer_id, id, 'DELIVERY_STATUS_CHANGED', v_title, v_body from public.orders where id = v_delivery.order_id;
  return v_delivery_status;
end;
$$;

create or replace function public.customer_confirm_delivery(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_courier_id uuid;
begin
  select d.courier_id into v_courier_id
  from public.deliveries d join public.orders o on o.id = d.order_id
  where d.order_id = p_order_id and o.customer_id = auth.uid() and d.status = 'AT_CUSTOMER'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'DELIVERY_CONFIRMATION_NOT_ALLOWED'; end if;
  update public.deliveries set status = 'DELIVERED', delivered_at = now() where order_id = p_order_id;
  update public.orders set status = 'DELIVERED' where id = p_order_id;
  update public.payments set status = 'CONFIRMED', confirmed_at = now() where order_id = p_order_id and method = 'COD';
  update public.couriers set is_available = true, successful_deliveries = successful_deliveries + 1 where id = v_courier_id;
  insert into public.notifications(recipient_id, order_id, event_type, title, body)
  values (auth.uid(), p_order_id, 'DELIVERED', 'تم تأكيد الاستلام', 'تم تسجيل استلام الطلب وتسليمه بنجاح.');
  return true;
end;
$$;

revoke execute on function public.courier_set_availability(boolean) from public, anon;
revoke execute on function public.courier_list_delivery_jobs() from public, anon;
revoke execute on function public.courier_claim_delivery(uuid) from public, anon;
revoke execute on function public.courier_decline_delivery(uuid) from public, anon;
revoke execute on function public.courier_update_delivery(uuid, text) from public, anon;
revoke execute on function public.customer_confirm_delivery(uuid) from public, anon;
grant execute on function public.courier_set_availability(boolean) to authenticated;
grant execute on function public.courier_list_delivery_jobs() to authenticated;
grant execute on function public.courier_claim_delivery(uuid) to authenticated;
grant execute on function public.courier_decline_delivery(uuid) to authenticated;
grant execute on function public.courier_update_delivery(uuid, text) to authenticated;
grant execute on function public.customer_confirm_delivery(uuid) to authenticated;

-- Realtime is an optimization; all pages retain server-rendered/polling fallbacks.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      execute 'alter publication supabase_realtime add table public.orders';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deliveries') then
      execute 'alter publication supabase_realtime add table public.deliveries';
    end if;
  end if;
end;
$$;

-- Apply max_quantity to the discounted portion of an order line. The cheapest valid
-- offer is selected, while units beyond its cap use the original price.
create or replace function public.calculate_effective_store_product_line_total(p_store_product_id uuid, p_quantity integer)
returns numeric(12, 2)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_price numeric(12, 2);
  v_total numeric(12, 2);
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_QUANTITY';
  end if;
  select price into v_price from public.store_products where id = p_store_product_id;
  if v_price is null then raise exception using errcode = 'P0001', message = 'INVALID_STORE_PRODUCT'; end if;
  select least(
    v_price * p_quantity,
    coalesce(min(
      (
        case
          when o.discount_type = 'PERCENTAGE' then greatest(0, round(sp.price - (sp.price * o.discount_value / 100), 2))
          else greatest(0, round(sp.price - o.discount_value, 2))
        end
      ) * least(p_quantity, coalesce(o.max_quantity, p_quantity))
      + sp.price * greatest(p_quantity - coalesce(o.max_quantity, p_quantity), 0)
    ), v_price * p_quantity)
  )::numeric(12, 2)
  into v_total
  from public.store_products sp
  left join public.offer_products op on op.store_product_id = sp.id
  left join public.offers o on o.id = op.offer_id
    and o.is_active and now() >= o.starts_at and now() < o.ends_at
  where sp.id = p_store_product_id;
  return round(coalesce(v_total, v_price * p_quantity), 2);
end;
$$;
revoke execute on function public.calculate_effective_store_product_line_total(uuid, integer) from public, anon;
grant execute on function public.calculate_effective_store_product_line_total(uuid, integer) to authenticated;

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
    select sp into v_store_product from public.store_products sp join public.products p on p.id = sp.product_id where sp.id = (v_item ->> 'storeProductId')::uuid and sp.store_id = p_store_id and sp.is_active;
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
    select sp into v_store_product from public.store_products sp join public.products p on p.id = sp.product_id where sp.id = (v_item ->> 'storeProductId')::uuid and sp.store_id = p_store_id;
    select p into v_product from public.products p where p.id = v_store_product.product_id;
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

-- Public discovery may expose aggregate popularity, never customer order rows.
create or replace function public.get_popular_stores(p_limit integer default 6)
returns table(store_id uuid, order_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.store_id, count(*)::bigint
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.store_id is not null
    and s.is_active
    and o.status not in ('CANCELLED', 'FAILED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED')
  group by o.store_id
  order by count(*) desc, o.store_id
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;
revoke execute on function public.get_popular_stores(integer) from public;
grant execute on function public.get_popular_stores(integer) to anon, authenticated;
