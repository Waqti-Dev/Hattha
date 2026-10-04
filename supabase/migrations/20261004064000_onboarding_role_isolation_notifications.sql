-- Hattha onboarding role isolation and approval notifications.
-- No seed data and no credentials.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_onboarding_role text;
begin
  v_onboarding_role := new.raw_user_meta_data ->> 'onboarding_role';
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone')
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone);

  if coalesce(v_onboarding_role, 'CUSTOMER') not in ('MERCHANT', 'COURIER') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'CUSTOMER')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.approve_merchant_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_app public.merchant_applications%rowtype; v_store_id uuid;
begin
  if auth.uid() is null or not public.has_role('ADMIN') then raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED'; end if;
  select * into v_app from public.merchant_applications where id = p_application_id for update;
  if not found or v_app.status <> 'PENDING' then raise exception using errcode = 'P0001', message = 'APPLICATION_NOT_PENDING'; end if;
  insert into public.stores(name, category, description, address, phone, location, is_active, is_verified)
  values (v_app.store_name, v_app.store_category, v_app.business_description, v_app.store_address, v_app.store_phone, v_app.store_location, true, true)
  returning id into v_store_id;
  delete from public.user_roles where user_id = v_app.applicant_id and role = 'CUSTOMER';
  insert into public.user_roles(user_id, role) values (v_app.applicant_id, 'MERCHANT') on conflict do nothing;
  insert into public.store_staff(store_id, user_id) values (v_store_id, v_app.applicant_id);
  update public.merchant_applications set status = 'APPROVED', updated_at = now() where id = v_app.id;
  insert into public.notifications(recipient_id, event_type, title, body)
  values (v_app.applicant_id, 'MERCHANT_APPROVED', 'تم قبول طلب الانضمام كتاجر في Hattha 🎉', 'يمكنك الآن تسجيل الدخول والوصول إلى لوحة التاجر وإضافة منتجاتك.');
  return v_store_id;
end;
$$;

create or replace function public.approve_courier_application(p_courier_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role('ADMIN') then raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED'; end if;
  update public.couriers set verification_status = 'VERIFIED', verification_note = null, is_available = false, updated_at = now()
  where id = p_courier_id and verification_status = 'PENDING_VERIFICATION';
  if not found then raise exception using errcode = 'P0001', message = 'COURIER_NOT_PENDING'; end if;
  delete from public.user_roles where user_id = p_courier_id and role = 'CUSTOMER';
  insert into public.user_roles(user_id, role) values (p_courier_id, 'COURIER') on conflict do nothing;
  insert into public.notifications(recipient_id, event_type, title, body)
  values (p_courier_id, 'COURIER_APPROVED', 'تم قبول طلب الانضمام كمندوب في Hattha 🎉', 'يمكنك الآن تسجيل الدخول والوصول إلى مهام التوصيل.');
end;
$$;
