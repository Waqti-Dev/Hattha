alter table public.stores add column if not exists category text;

create or replace function public.merchant_update_store(p_store_id uuid, p_name text, p_category text, p_address text, p_phone text, p_location jsonb, p_description text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_store_staff(p_store_id) then raise exception using errcode = 'P0001', message = 'MERCHANT_STORE_ACCESS_DENIED'; end if;
  update public.stores set name = nullif(trim(p_name), ''), category = nullif(trim(p_category), ''), address = nullif(trim(p_address), ''), phone = nullif(trim(p_phone), ''), location = p_location, description = nullif(trim(p_description), '') where id = p_store_id;
  if not found then raise exception using errcode = 'P0001', message = 'STORE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.approve_merchant_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_app public.merchant_applications%rowtype; v_store_id uuid;
begin
  if not public.has_role('ADMIN') then raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED'; end if;
  select * into v_app from public.merchant_applications where id = p_application_id for update;
  if not found or v_app.status <> 'PENDING' then raise exception using errcode = 'P0001', message = 'APPLICATION_NOT_PENDING'; end if;
  insert into public.stores(name, category, description, address, phone, location, is_active, is_verified) values (v_app.store_name, v_app.store_category, v_app.business_description, v_app.store_address, v_app.store_phone, v_app.store_location, true, true) returning id into v_store_id;
  insert into public.user_roles(user_id, role) values (v_app.applicant_id, 'MERCHANT') on conflict do nothing;
  insert into public.store_staff(store_id, user_id) values (v_store_id, v_app.applicant_id);
  update public.merchant_applications set status = 'APPROVED', updated_at = now() where id = v_app.id;
  return v_store_id;
end;
$$;
