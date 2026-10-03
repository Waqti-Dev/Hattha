-- Customer cancellation is limited to states before store acceptance.
create or replace function public.cancel_customer_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and customer_id = auth.uid() for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  if v_order.status not in ('CREATED', 'PAYMENT_PENDING', 'FINDING_STORE', 'STORE_CONFIRMING', 'WAITING_PAYMENT_CONFIRMATION') then
    raise exception using errcode = 'P0001', message = 'ORDER_CANNOT_BE_CANCELLED';
  end if;
  update public.orders set status = 'CANCELLED' where id = p_order_id;
  insert into public.payment_events (payment_id, event_type, amount, metadata)
  select id, 'ORDER_CANCELLED', amount, jsonb_build_object('order_id', p_order_id)
  from public.payments where order_id = p_order_id;
  return true;
end;
$$;
revoke execute on function public.cancel_customer_order(uuid) from public, anon;
grant execute on function public.cancel_customer_order(uuid) to authenticated;
