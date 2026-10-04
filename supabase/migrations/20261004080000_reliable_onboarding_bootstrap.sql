-- Reliable onboarding bootstrap. No seed/demo data.
-- Email confirmation and merchant approval remain separate events.

create or replace function public.bootstrap_onboarding()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meta jsonb;
  v_role text;
  v_status text;
  v_full_name text;
  v_phone text;
  v_email text;
  v_store_name text;
  v_store_category text;
  v_store_address text;
  v_store_phone text;
  v_store_location jsonb;
  v_business_description text;
  v_national_id text;
  v_vehicle_type text;
  v_vehicle_plate text;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTHENTICATION_REQUIRED';
  end if;

  v_meta := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  v_role := v_meta ->> 'onboarding_role';

  if v_role = 'MERCHANT' then
    select status into v_status
    from public.merchant_applications
    where applicant_id = v_user_id
    order by created_at desc
    limit 1;
    if v_status in ('PENDING', 'APPROVED') then return v_status; end if;

    v_full_name := nullif(trim(v_meta #>> '{merchant_application,fullName}'), '');
    v_phone := nullif(trim(v_meta #>> '{merchant_application,phone}'), '');
    v_email := lower(nullif(trim(v_meta #>> '{merchant_application,email}'), ''));
    v_store_name := nullif(trim(v_meta #>> '{merchant_application,storeName}'), '');
    v_store_category := nullif(trim(v_meta #>> '{merchant_application,storeCategory}'), '');
    v_store_address := nullif(trim(v_meta #>> '{merchant_application,storeAddress}'), '');
    v_store_phone := nullif(trim(v_meta #>> '{merchant_application,storePhone}'), '');
    v_store_location := v_meta #> '{merchant_application,storeLocation}';
    v_business_description := nullif(trim(v_meta #>> '{merchant_application,businessDescription}'), '');

    if v_full_name is null or v_phone is null or v_email is null or v_store_name is null or v_store_category is null or v_store_address is null or v_store_phone is null then
      raise exception using errcode = 'P0001', message = 'MERCHANT_APPLICATION_INVALID';
    end if;

    insert into public.merchant_applications (
      applicant_id, full_name, phone, email, store_name, store_category,
      store_address, store_location, store_phone, business_description, status
    ) values (
      v_user_id, v_full_name, v_phone, v_email, v_store_name, v_store_category,
      v_store_address, v_store_location, v_store_phone, v_business_description, 'PENDING'
    );
    return 'PENDING';
  end if;

  if v_role = 'COURIER' then
    select verification_status into v_status from public.couriers where id = v_user_id;
    if v_status in ('PENDING_VERIFICATION', 'VERIFIED') then return v_status; end if;

    v_national_id := nullif(trim(v_meta #>> '{courier_application,nationalIdReference}'), '');
    v_vehicle_type := nullif(trim(v_meta #>> '{courier_application,vehicleType}'), '');
    v_vehicle_plate := nullif(trim(v_meta #>> '{courier_application,vehiclePlate}'), '');
    if v_national_id is null or v_vehicle_type is null or v_vehicle_plate is null then
      raise exception using errcode = 'P0001', message = 'COURIER_APPLICATION_INVALID';
    end if;

    insert into public.couriers (id, verification_status, national_id_reference, vehicle_type, vehicle_plate, is_available)
    values (v_user_id, 'PENDING_VERIFICATION', v_national_id, v_vehicle_type, v_vehicle_plate, false);
    return 'PENDING_VERIFICATION';
  end if;

  return 'CUSTOMER';
end;
$$;

revoke execute on function public.bootstrap_onboarding() from public, anon;
grant execute on function public.bootstrap_onboarding() to authenticated;
