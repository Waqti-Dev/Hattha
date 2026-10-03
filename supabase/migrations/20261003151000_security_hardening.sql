-- HATTAHA Phase 1 hardening: restrict internal helper RPCs and cover foreign keys.

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.has_role(public.app_role) from anon, authenticated;
revoke execute on function public.is_store_staff(uuid) from anon, authenticated;
revoke execute on function public.is_order_customer(uuid) from anon, authenticated;

create index if not exists addresses_customer_id_idx on public.addresses(customer_id);
create index if not exists inventory_updated_by_idx on public.inventory(updated_by);
create index if not exists notifications_order_id_idx on public.notifications(order_id);
create index if not exists order_attempts_store_id_idx on public.order_attempts(store_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_store_product_id_idx on public.order_items(store_product_id);
create index if not exists payment_events_payment_id_idx on public.payment_events(payment_id);
create index if not exists platform_settings_updated_by_idx on public.platform_settings(updated_by);
create index if not exists reviews_courier_id_idx on public.reviews(courier_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);
create index if not exists reviews_store_id_idx on public.reviews(store_id);
create index if not exists store_products_product_id_idx on public.store_products(product_id);
create index if not exists store_staff_user_id_idx on public.store_staff(user_id);
