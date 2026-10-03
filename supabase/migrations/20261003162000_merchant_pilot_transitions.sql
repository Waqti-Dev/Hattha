-- Merchant Pilot MVP: secure, role- and store-scoped order transitions.
create or replace function public.merchant_update_order_status(
  p_order_id uuid,
  p_action text,
  p_rejection_reason public.rejection_reason default 'OTHER'
)
returns public.order_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_status public.order_status;
  v_attempt_number integer;
  v_title text;
  v_body text;
begin
  if auth.uid() is null or not public.has_role('MERCHANT') then
    raise exception using errcode = 'P0001', message = 'MERCHANT_AUTHENTICATION_REQUIRED';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;
  if v_order.store_id is null or not public.is_store_staff(v_order.store_id) then
    raise exception using errcode = 'P0001', message = 'MERCHANT_STORE_ACCESS_DENIED';
  end if;

  if p_action = 'ACCEPT' then
    if v_order.status not in ('FINDING_STORE', 'STORE_CONFIRMING') then
      raise exception using errcode = 'P0001', message = 'INVALID_ACCEPT_TRANSITION';
    end if;
    v_status := 'ACCEPTED';
    v_title := 'تم قبول طلبك';
    v_body := 'تم قبول طلبك من المتجر وسيبدأ التحضير قريباً.';
  elsif p_action = 'REJECT' then
    if v_order.status not in ('FINDING_STORE', 'STORE_CONFIRMING') then
      raise exception using errcode = 'P0001', message = 'INVALID_REJECT_TRANSITION';
    end if;
    v_status := 'FAILED';
    v_title := 'تعذّر تنفيذ الطلب';
    v_body := 'تعذّر على المتجر تنفيذ الطلب حالياً.';
  elsif p_action = 'PREPARING' then
    if v_order.status <> 'ACCEPTED' then
      raise exception using errcode = 'P0001', message = 'INVALID_PREPARING_TRANSITION';
    end if;
    v_status := 'PREPARING';
    v_title := 'بدأ تجهيز طلبك';
    v_body := 'بدأ المتجر تجهيز طلبك.';
  elsif p_action = 'READY' then
    if v_order.status <> 'PREPARING' then
      raise exception using errcode = 'P0001', message = 'INVALID_READY_TRANSITION';
    end if;
    v_status := 'READY_FOR_PICKUP';
    v_title := 'طلبك جاهز';
    v_body := 'طلبك جاهز للاستلام والتوصيل اليدوي.';
  else
    raise exception using errcode = 'P0001', message = 'UNKNOWN_MERCHANT_ACTION';
  end if;

  update public.orders set status = v_status where id = v_order.id;

  if p_action in ('ACCEPT', 'REJECT') then
    select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
    from public.order_attempts where order_id = v_order.id;
    insert into public.order_attempts (order_id, store_id, attempt_number, status, reason, responded_at)
    values (
      v_order.id,
      v_order.store_id,
      v_attempt_number,
      case when p_action = 'ACCEPT' then 'ACCEPTED'::public.order_attempt_status else 'DECLINED'::public.order_attempt_status end,
      case when p_action = 'REJECT' then coalesce(p_rejection_reason, 'OTHER'::public.rejection_reason) else null end,
      now()
    );
  end if;

  insert into public.notifications (recipient_id, order_id, event_type, title, body)
  values (v_order.customer_id, v_order.id, 'ORDER_STATUS_CHANGED', v_title, v_body);

  return v_status;
end;
$$;

revoke execute on function public.merchant_update_order_status(uuid, text, public.rejection_reason) from public, anon;
grant execute on function public.merchant_update_order_status(uuid, text, public.rejection_reason) to authenticated;
