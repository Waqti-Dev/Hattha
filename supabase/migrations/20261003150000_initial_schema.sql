-- HATTAHA Phase 1: normalized schema, integrity constraints, and RLS.
-- No privileged secrets are required by this migration.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('CUSTOMER', 'MERCHANT', 'COURIER', 'ADMIN');
create type public.inventory_status as enum ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');
create type public.courier_verification_status as enum ('PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'BLOCKED');
create type public.payment_method as enum ('ONLINE', 'COD');
create type public.online_payment_method as enum ('CARD', 'E_WALLET');
create type public.payment_status as enum ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'REFUNDED');
create type public.order_status as enum (
  'CREATED', 'PAYMENT_PENDING', 'FINDING_STORE', 'STORE_CONFIRMING',
  'WAITING_PAYMENT_CONFIRMATION', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP',
  'COURIER_ASSIGNED', 'COURIER_GOING_TO_STORE', 'COURIER_AT_STORE', 'PICKED_UP',
  'COURIER_GOING_TO_CUSTOMER', 'COURIER_AT_CUSTOMER', 'CUSTOMER_CONFIRMED_DELIVERY',
  'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'FAILED', 'REFUNDED'
);
create type public.order_attempt_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'TIMED_OUT', 'CANCELLED');
create type public.delivery_status as enum (
  'OFFERED', 'ASSIGNED', 'GOING_TO_STORE', 'AT_STORE', 'PICKED_UP',
  'GOING_TO_CUSTOMER', 'AT_CUSTOMER', 'DELIVERED', 'DECLINED', 'CANCELLED'
);
create type public.rejection_reason as enum ('STORE_BUSY', 'PRODUCT_UNAVAILABLE', 'STORE_CLOSED', 'TECHNICAL_PROBLEM', 'OTHER');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  phone text,
  address text not null,
  location jsonb,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  is_open boolean not null default true,
  operational_available boolean not null default true,
  payment_destination text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_staff (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, product_id)
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status public.inventory_status not null default 'UNKNOWN',
  quantity integer check (quantity is null or quantity >= 0),
  last_updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (store_id, product_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  address_line text not null,
  area text not null,
  city text not null default 'Baltim',
  location jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid references public.stores(id) on delete restrict,
  status public.order_status not null default 'CREATED',
  payment_method public.payment_method not null,
  online_payment_method public.online_payment_method,
  fallback_allowed boolean not null default false,
  max_fallback_price_difference numeric(12, 2) not null default 0 check (max_fallback_price_difference >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  service_fee numeric(12, 2) not null default 0 check (service_fee >= 0),
  total numeric(12, 2) not null check (total >= 0),
  delivery_address_snapshot jsonb not null,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_method_required check (
    (payment_method = 'ONLINE' and online_payment_method is not null)
    or (payment_method = 'COD' and online_payment_method is null)
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_product_id uuid not null references public.store_products(id) on delete restrict,
  product_name_snapshot text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  status public.order_attempt_status not null default 'PENDING',
  reason public.rejection_reason,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (order_id, attempt_number)
);

create table public.couriers (
  id uuid primary key references public.profiles(id) on delete cascade,
  verification_status public.courier_verification_status not null default 'PENDING_VERIFICATION',
  national_id_document_path text,
  personal_photo_path text,
  vehicle_type text,
  vehicle_plate text,
  is_available boolean not null default false,
  cod_limit numeric(12, 2) not null default 0 check (cod_limit >= 0),
  successful_deliveries integer not null default 0 check (successful_deliveries >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  courier_id uuid references public.couriers(id) on delete restrict,
  pickup_location jsonb not null,
  delivery_location jsonb not null,
  amount_to_collect numeric(12, 2) not null default 0 check (amount_to_collect >= 0),
  courier_earnings numeric(12, 2) not null default 0 check (courier_earnings >= 0),
  status public.delivery_status not null default 'OFFERED',
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  method public.payment_method not null,
  online_method public.online_payment_method,
  provider text,
  provider_payment_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.payment_status not null default 'PENDING',
  expires_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_online_method_required check (
    (method = 'ONLINE' and online_method is not null)
    or (method = 'COD' and online_method is null)
  )
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  event_type text not null,
  provider_event_id text,
  amount numeric(12, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  channel text not null default 'IN_APP',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid references public.stores(id) on delete restrict,
  courier_id uuid references public.couriers(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_store_id_idx on public.orders(store_id);
create index orders_customer_id_idx on public.orders(customer_id);
create index deliveries_courier_id_idx on public.deliveries(courier_id);
create index deliveries_status_idx on public.deliveries(status);
create index payments_status_idx on public.payments(status);
create index store_products_store_id_idx on public.store_products(store_id);
create index inventory_store_id_idx on public.inventory(store_id);
create index inventory_product_id_idx on public.inventory(product_id);
create index notifications_recipient_id_idx on public.notifications(recipient_id, created_at desc);
create index order_attempts_order_id_idx on public.order_attempts(order_id, attempt_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger store_products_set_updated_at before update on public.store_products for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger couriers_set_updated_at before update on public.couriers for each row execute function public.set_updated_at();
create trigger deliveries_set_updated_at before update on public.deliveries for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'CUSTOMER')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = required_role
  );
$$;

create or replace function public.is_store_staff(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('MERCHANT') and exists (
    select 1 from public.store_staff
    where store_id = target_store_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_order_customer(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.orders where id = target_order_id and customer_id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.stores enable row level security;
alter table public.store_staff enable row level security;
alter table public.products enable row level security;
alter table public.store_products enable row level security;
alter table public.inventory enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_attempts enable row level security;
alter table public.couriers enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.platform_settings enable row level security;

create policy profiles_select_self_or_admin on public.profiles for select using (id = auth.uid() or public.has_role('ADMIN'));
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());
create policy profiles_update_self_or_admin on public.profiles for update using (id = auth.uid() or public.has_role('ADMIN')) with check (id = auth.uid() or public.has_role('ADMIN'));

create policy user_roles_select_self_or_admin on public.user_roles for select using (user_id = auth.uid() or public.has_role('ADMIN'));
create policy user_roles_admin_manage on public.user_roles for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy stores_public_read on public.stores for select using (is_active = true or public.has_role('ADMIN') or public.is_store_staff(id));
create policy stores_admin_manage on public.stores for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy store_staff_member_read on public.store_staff for select using (user_id = auth.uid() or public.has_role('ADMIN') or public.is_store_staff(store_id));
create policy store_staff_admin_manage on public.store_staff for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy products_public_read on public.products for select using (true);
create policy products_admin_manage on public.products for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy store_products_public_read on public.store_products for select using (
  is_active and exists (select 1 from public.stores s where s.id = store_id and s.is_active)
  or public.has_role('ADMIN') or public.is_store_staff(store_id)
);
create policy store_products_staff_manage on public.store_products for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
create policy store_products_admin_manage on public.store_products for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy inventory_public_read on public.inventory for select using (
  exists (select 1 from public.stores s where s.id = store_id and s.is_active)
  or public.has_role('ADMIN') or public.is_store_staff(store_id)
);
create policy inventory_staff_manage on public.inventory for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
create policy inventory_admin_manage on public.inventory for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy addresses_customer_manage on public.addresses for all using (customer_id = auth.uid() or public.has_role('ADMIN')) with check (customer_id = auth.uid() or public.has_role('ADMIN'));

create policy orders_customer_read on public.orders for select using (customer_id = auth.uid() or public.has_role('ADMIN') or (store_id is not null and public.is_store_staff(store_id)));
create policy orders_customer_insert on public.orders for insert with check (customer_id = auth.uid());
create policy orders_admin_manage on public.orders for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy order_items_customer_read on public.order_items for select using (public.is_order_customer(order_id) or public.has_role('ADMIN') or exists (select 1 from public.orders o where o.id = order_id and o.store_id is not null and public.is_store_staff(o.store_id)));
create policy order_items_customer_insert on public.order_items for insert with check (public.is_order_customer(order_id));
create policy order_items_admin_manage on public.order_items for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy order_attempts_staff_read on public.order_attempts for select using (public.has_role('ADMIN') or public.is_store_staff(store_id) or public.is_order_customer(order_id));
create policy order_attempts_admin_manage on public.order_attempts for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy couriers_self_or_admin_read on public.couriers for select using (id = auth.uid() or public.has_role('ADMIN'));
create policy couriers_self_update on public.couriers for update using (id = auth.uid()) with check (id = auth.uid());
create policy couriers_admin_manage on public.couriers for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy deliveries_customer_read on public.deliveries for select using (public.is_order_customer(order_id) or courier_id = auth.uid() or public.has_role('ADMIN'));
create policy deliveries_courier_update on public.deliveries for update using (courier_id = auth.uid()) with check (courier_id = auth.uid());
create policy deliveries_admin_manage on public.deliveries for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy payments_customer_read on public.payments for select using (public.is_order_customer(order_id) or public.has_role('ADMIN') or exists (select 1 from public.orders o where o.id = order_id and o.store_id is not null and public.is_store_staff(o.store_id)));
create policy payments_admin_manage on public.payments for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy payment_events_authorized_read on public.payment_events for select using (
  public.has_role('ADMIN') or exists (
    select 1 from public.payments p join public.orders o on o.id = p.order_id
    where p.id = payment_id and (o.customer_id = auth.uid() or (o.store_id is not null and public.is_store_staff(o.store_id)))
  )
);
create policy payment_events_admin_insert on public.payment_events for insert with check (public.has_role('ADMIN'));

create policy notifications_recipient_read on public.notifications for select using (recipient_id = auth.uid() or public.has_role('ADMIN'));
create policy notifications_recipient_update on public.notifications for update using (recipient_id = auth.uid() or public.has_role('ADMIN')) with check (recipient_id = auth.uid() or public.has_role('ADMIN'));
create policy notifications_admin_insert on public.notifications for insert with check (public.has_role('ADMIN'));

create policy reviews_customer_read on public.reviews for select using (customer_id = auth.uid() or public.has_role('ADMIN'));
create policy reviews_customer_insert on public.reviews for insert with check (customer_id = auth.uid() and public.is_order_customer(order_id));
create policy reviews_admin_manage on public.reviews for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy settings_public_read on public.platform_settings for select using (true);
create policy settings_admin_manage on public.platform_settings for all using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

insert into public.platform_settings (key, value, description) values
  ('store_confirmation_timeout_minutes', '10', 'Maximum minutes for a store to confirm an order'),
  ('payment_timeout_minutes', '15', 'Maximum minutes for payment confirmation'),
  ('courier_new_cod_limit', '500', 'Initial courier COD exposure limit in EGP'),
  ('delivery_pricing', '{"base_fee": 15, "distance_fee": 3}', 'Configurable delivery pricing in EGP'),
  ('commercial_fees', '{"merchant_commission": 0, "customer_service_fee": 0, "delivery_fee": 15, "courier_earnings": 10}', 'Configurable platform commercial values'),
  ('fallback_rules', '{"enabled_by_default": false, "max_price_difference": 20}', 'Default fallback selection configuration')
on conflict (key) do nothing;
