-- Remove the implicit PUBLIC execute privilege from internal authorization helpers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(public.app_role) from public, anon, authenticated;
revoke execute on function public.is_store_staff(uuid) from public, anon, authenticated;
revoke execute on function public.is_order_customer(uuid) from public, anon, authenticated;
