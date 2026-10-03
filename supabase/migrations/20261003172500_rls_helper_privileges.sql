-- Restore execution privileges required by existing RLS policies.
-- These helpers remain security-definer and enforce their own authorization checks.
grant execute on function public.has_role(public.app_role) to anon, authenticated;
grant execute on function public.is_store_staff(uuid) to anon, authenticated;
grant execute on function public.is_order_customer(uuid) to anon, authenticated;
