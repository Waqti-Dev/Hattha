import { createClient } from "@/lib/supabase/server";

export type MerchantStore = { id: string; name: string; address: string };

export async function getMerchantContext() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { user: null, stores: [] as MerchantStore[] };
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "MERCHANT").maybeSingle();
  if (!role) return { user: auth.user, stores: [] as MerchantStore[] };
  const { data, error } = await supabase.from("store_staff").select("store_id, stores(id, name, address)").eq("user_id", auth.user.id);
  if (error) throw new Error(error.message);
  const stores = (data ?? []).map((row) => (row as unknown as { stores: MerchantStore }).stores).filter(Boolean);
  return { user: auth.user, stores };
}

export async function getMerchantOrders() {
  const context = await getMerchantContext();
  if (!context.user || context.stores.length === 0) return { ...context, orders: [] as unknown[] };
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("id, store_id, status, payment_method, subtotal, delivery_fee, service_fee, total, customer_note, created_at, updated_at, stores(name), payments(status), order_items(id, product_name_snapshot, unit_price, quantity, line_total)").in("store_id", context.stores.map((store) => store.id)).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { ...context, orders: (data ?? []) as unknown[] };
}

export async function getMerchantOrder(orderId: string) {
  const context = await getMerchantContext();
  if (!context.user || context.stores.length === 0) return { ...context, order: null };
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("id, store_id, status, payment_method, online_payment_method, subtotal, delivery_fee, service_fee, total, customer_note, delivery_address_snapshot, created_at, updated_at, stores(name), payments(status), order_items(id, product_name_snapshot, unit_price, quantity, line_total)").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  const allowed = data && context.stores.some((store) => store.id === (data as unknown as { store_id: string }).store_id);
  return { ...context, order: allowed ? data as unknown as Record<string, unknown> : null };
}
