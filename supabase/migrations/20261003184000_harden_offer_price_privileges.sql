-- The price helper is an internal dependency of create_customer_order, not a public RPC.
revoke execute on function public.calculate_effective_store_product_price(uuid) from public, anon, authenticated;
