-- Qualify courier profile columns because RETURNS TABLE exposes an output parameter named id.
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
  if not exists (select 1 from public.couriers c where c.id = auth.uid() and c.verification_status = 'VERIFIED') then
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
revoke execute on function public.courier_list_delivery_jobs() from public, anon;
grant execute on function public.courier_list_delivery_jobs() to authenticated;
