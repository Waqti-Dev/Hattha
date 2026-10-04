-- Preserve the catalog price when a store product has no active offer.
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
      case when o.id is null then null else
        (case
          when o.discount_type = 'PERCENTAGE' then greatest(0, round(sp.price - (sp.price * o.discount_value / 100), 2))
          else greatest(0, round(sp.price - o.discount_value, 2))
        end) * least(p_quantity, coalesce(o.max_quantity, p_quantity))
        + sp.price * greatest(p_quantity - coalesce(o.max_quantity, p_quantity), 0)
      end
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
