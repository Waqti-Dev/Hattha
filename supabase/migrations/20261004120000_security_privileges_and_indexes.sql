-- Restrict internal helpers that are only used by triggers or server-owned RPCs.
-- Aggregate discovery remains intentionally public; role/ownership helpers remain
-- executable because RLS policies call them.
revoke execute on function public.notify_new_order() from public, anon, authenticated;
revoke execute on function public.ensure_delivery_for_ready_order() from public, anon, authenticated;
revoke execute on function public.calculate_effective_store_product_line_total(uuid, integer) from public, anon, authenticated;

-- Cover the nullable foreign keys used by favorite cleanup and joins.
create index if not exists customer_favorites_store_idx
  on public.customer_favorites(store_id)
  where store_id is not null;
create index if not exists customer_favorites_store_product_idx
  on public.customer_favorites(store_product_id)
  where store_product_id is not null;
