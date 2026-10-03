-- Hattha real merchant pilot: onboarding applications, merchant management, and offers.
-- No seed/demo data is inserted by this migration.

alter table public.products add column if not exists category text;
alter table public.couriers add column if not exists national_id_reference text;

create table if not exists public.merchant_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  store_name text not null,
  store_category text not null,
  store_address text not null,
  store_location jsonb,
  store_phone text not null,
  business_description text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists merchant_applications_one_pending_per_user
  on public.merchant_applications(applicant_id) where status = 'PENDING';

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  discount_type text not null check (discount_type in ('PERCENTAGE', 'FIXED')),
  discount_value numeric(12, 2) not null check (discount_value >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_quantity integer check (max_quantity is null or max_quantity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((discount_type = 'PERCENTAGE' and discount_value <= 100) or discount_type = 'FIXED')
);

create table if not exists public.offer_products (
  offer_id uuid not null references public.offers(id) on delete cascade,
  store_product_id uuid not null references public.store_products(id) on delete cascade,
  primary key (offer_id, store_product_id)
);

create index if not exists merchant_applications_applicant_idx on public.merchant_applications(applicant_id);
create index if not exists offers_store_idx on public.offers(store_id);
create index if not exists offer_products_store_product_idx on public.offer_products(store_product_id);

alter table public.merchant_applications enable row level security;
alter table public.offers enable row level security;
alter table public.offer_products enable row level security;

create policy merchant_applications_self_read on public.merchant_applications
  for select using (applicant_id = auth.uid() or public.has_role('ADMIN'));
create policy merchant_applications_self_insert on public.merchant_applications
  for insert with check (applicant_id = auth.uid() and status = 'PENDING');
create policy merchant_applications_admin_manage on public.merchant_applications
  for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy offers_public_read on public.offers
  for select using (
    is_active and now() >= starts_at and now() < ends_at
    and exists (select 1 from public.stores s where s.id = store_id and s.is_active)
    or public.has_role('ADMIN') or public.is_store_staff(store_id)
  );
create policy offers_staff_manage on public.offers
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
create policy offers_admin_manage on public.offers
  for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy offer_products_public_read on public.offer_products
  for select using (
    exists (select 1 from public.offers o where o.id = offer_id and o.is_active and now() >= o.starts_at and now() < o.ends_at)
    or public.has_role('ADMIN')
    or exists (select 1 from public.offers o where o.id = offer_id and public.is_store_staff(o.store_id))
  );
create policy offer_products_staff_manage on public.offer_products
  for all using (exists (select 1 from public.offers o where o.id = offer_id and public.is_store_staff(o.store_id)))
  with check (exists (select 1 from public.offers o join public.store_products sp on sp.store_id = o.store_id where o.id = offer_id and sp.id = store_product_id and public.is_store_staff(o.store_id)));
create policy offer_products_admin_manage on public.offer_products
  for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create or replace function public.calculate_effective_store_product_price(p_store_product_id uuid)
returns numeric(12, 2)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(min(
    case
      when o.discount_type = 'PERCENTAGE' then greatest(0, round(sp.price - (sp.price * o.discount_value / 100), 2))
      else greatest(0, round(sp.price - o.discount_value, 2))
    end
  ), (select price from public.store_products where id = p_store_product_id))::numeric(12, 2)
  from public.store_products sp
  left join public.offer_products op on op.store_product_id = sp.id
  left join public.offers o on o.id = op.offer_id
    and o.is_active and now() >= o.starts_at and now() < o.ends_at
  where sp.id = p_store_product_id;
$$;

create or replace function public.merchant_update_store(
  p_store_id uuid,
  p_name text,
  p_category text,
  p_address text,
  p_phone text,
  p_location jsonb,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_store_staff(p_store_id) then
    raise exception using errcode = 'P0001', message = 'MERCHANT_STORE_ACCESS_DENIED';
  end if;
  update public.stores
  set name = nullif(trim(p_name), ''),
      address = nullif(trim(p_address), ''),
      phone = nullif(trim(p_phone), ''),
      location = p_location,
      description = nullif(trim(p_description), '')
  where id = p_store_id;
  if not found then raise exception using errcode = 'P0001', message = 'STORE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.merchant_upsert_product(
  p_store_id uuid,
  p_product_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_price numeric,
  p_is_active boolean,
  p_inventory_status public.inventory_status,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := p_product_id;
  v_store_product_id uuid;
begin
  if not public.is_store_staff(p_store_id) then
    raise exception using errcode = 'P0001', message = 'MERCHANT_STORE_ACCESS_DENIED';
  end if;
  if p_price < 0 or p_quantity < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PRODUCT_VALUES';
  end if;
  if v_product_id is null then
    insert into public.products(name, category, description) values (nullif(trim(p_name), ''), nullif(trim(p_category), ''), nullif(trim(p_description), '')) returning id into v_product_id;
  else
    select product_id into v_product_id from public.store_products where id = p_product_id and store_id = p_store_id;
    if v_product_id is null then
      raise exception using errcode = 'P0001', message = 'PRODUCT_STORE_ACCESS_DENIED';
    end if;
    update public.products set name = nullif(trim(p_name), ''), category = nullif(trim(p_category), ''), description = nullif(trim(p_description), '') where id = v_product_id;
  end if;
  insert into public.store_products(store_id, product_id, price, is_active)
  values (p_store_id, v_product_id, p_price, coalesce(p_is_active, true))
  on conflict (store_id, product_id) do update set price = excluded.price, is_active = excluded.is_active
  returning id into v_store_product_id;
  insert into public.inventory(store_id, product_id, status, quantity, updated_by)
  values (p_store_id, v_product_id, p_inventory_status, p_quantity, auth.uid())
  on conflict (store_id, product_id) do update set status = excluded.status, quantity = excluded.quantity, updated_by = auth.uid(), last_updated_at = now();
  return v_store_product_id;
end;
$$;

create or replace function public.merchant_deactivate_product(p_store_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_store_id uuid;
begin
  select store_id into v_store_id from public.store_products where id = p_store_product_id;
  if v_store_id is null or not public.is_store_staff(v_store_id) then
    raise exception using errcode = 'P0001', message = 'MERCHANT_STORE_ACCESS_DENIED';
  end if;
  update public.store_products set is_active = false where id = p_store_product_id;
  update public.inventory i set status = 'UNAVAILABLE' where i.store_id = v_store_id and i.product_id = (select product_id from public.store_products where id = p_store_product_id);
end;
$$;

create or replace function public.approve_merchant_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_app public.merchant_applications%rowtype; v_store_id uuid;
begin
  if not public.has_role('ADMIN') then raise exception using errcode = 'P0001', message = 'ADMIN_AUTHENTICATION_REQUIRED'; end if;
  select * into v_app from public.merchant_applications where id = p_application_id for update;
  if not found or v_app.status <> 'PENDING' then raise exception using errcode = 'P0001', message = 'APPLICATION_NOT_PENDING'; end if;
  insert into public.stores(name, description, address, phone, location, is_active, is_verified)
  values (v_app.store_name, v_app.business_description, v_app.store_address, v_app.store_phone, v_app.store_location, true, true)
  returning id into v_store_id;
  insert into public.user_roles(user_id, role) values (v_app.applicant_id, 'MERCHANT') on conflict do nothing;
  insert into public.store_staff(store_id, user_id) values (v_store_id, v_app.applicant_id);
  update public.merchant_applications set status = 'APPROVED', updated_at = now() where id = v_app.id;
  return v_store_id;
end;
$$;

revoke execute on function public.merchant_update_store(uuid, text, text, text, text, jsonb, text) from public, anon;
revoke execute on function public.merchant_upsert_product(uuid, uuid, text, text, text, numeric, boolean, public.inventory_status, integer) from public, anon;
revoke execute on function public.merchant_deactivate_product(uuid) from public, anon;
revoke execute on function public.approve_merchant_application(uuid) from public, anon, authenticated;
grant execute on function public.merchant_update_store(uuid, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.merchant_upsert_product(uuid, uuid, text, text, text, numeric, boolean, public.inventory_status, integer) to authenticated;
grant execute on function public.merchant_deactivate_product(uuid) to authenticated;
grant execute on function public.approve_merchant_application(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), coalesce(new.phone, new.raw_user_meta_data ->> 'phone'))
  on conflict (id) do update set full_name = coalesce(public.profiles.full_name, excluded.full_name), phone = coalesce(public.profiles.phone, excluded.phone);
  insert into public.user_roles (user_id, role)
  values (new.id, 'CUSTOMER')
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
