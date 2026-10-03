-- Hattha Admin and onboarding workflows.
-- No seed/demo data and no credentials are stored here.

alter type public.courier_verification_status add value if not exists 'REJECTED';
alter table public.couriers add column if not exists verification_note text;

create index if not exists merchant_applications_status_created_idx
  on public.merchant_applications(status, created_at desc);
create index if not exists couriers_verification_status_idx
  on public.couriers(verification_status, created_at desc);

create or replace function public.reject_merchant_application(
  p_application_id uuid,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then
    raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED';
  end if;
  update public.merchant_applications
  set status = 'REJECTED', review_note = nullif(trim(p_review_note), ''), updated_at = now()
  where id = p_application_id and status = 'PENDING';
  if not found then
    raise exception using errcode = 'P0001', message = 'APPLICATION_NOT_PENDING';
  end if;
end;
$$;

create or replace function public.approve_courier_application(
  p_courier_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then
    raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED';
  end if;
  update public.couriers
  set verification_status = 'VERIFIED', verification_note = null, is_available = false, updated_at = now()
  where id = p_courier_id and verification_status = 'PENDING_VERIFICATION';
  if not found then
    raise exception using errcode = 'P0001', message = 'COURIER_NOT_PENDING';
  end if;
  insert into public.user_roles(user_id, role)
  values (p_courier_id, 'COURIER')
  on conflict do nothing;
end;
$$;

create or replace function public.reject_courier_application(
  p_courier_id uuid,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then
    raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED';
  end if;
  update public.couriers
  set verification_status = 'REJECTED', verification_note = nullif(trim(p_review_note), ''), is_available = false, updated_at = now()
  where id = p_courier_id and verification_status = 'PENDING_VERIFICATION';
  if not found then
    raise exception using errcode = 'P0001', message = 'COURIER_NOT_PENDING';
  end if;
end;
$$;

revoke execute on function public.reject_merchant_application(uuid, text) from public, anon, authenticated;
revoke execute on function public.approve_courier_application(uuid) from public, anon, authenticated;
revoke execute on function public.reject_courier_application(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_merchant_application(uuid, text) to authenticated;
grant execute on function public.approve_courier_application(uuid) to authenticated;
grant execute on function public.reject_courier_application(uuid, text) to authenticated;

-- A service-role/admin SQL operator may associate the known owner identity after Auth creation.
-- This function is deliberately not executable by browser roles and never accepts a secret.
create or replace function public.assign_admin_role_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then raise exception using errcode = 'P0001', message = 'ADMIN_OWNER_USER_NOT_FOUND'; end if;
  insert into public.user_roles(user_id, role) values (v_user_id, 'ADMIN') on conflict do nothing;
  return v_user_id;
end;
$$;
revoke execute on function public.assign_admin_role_by_email(text) from public, anon, authenticated;
