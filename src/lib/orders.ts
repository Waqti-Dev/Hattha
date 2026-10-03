import { createClient } from "@/lib/supabase/server";

export async function getCustomerOrders() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { user: null, orders: [] };
  const { data, error } = await supabase.from("orders").select("id, store_id, status, payment_method, subtotal, delivery_fee, service_fee, total, created_at, updated_at, stores(name), payments(status)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { user: auth.user, orders: (data ?? []) as unknown[] };
}

export async function getCustomerOrder(orderId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { user: null, order: null };
  const { data, error } = await supabase.from("orders").select("id, store_id, status, payment_method, online_payment_method, subtotal, delivery_fee, service_fee, total, delivery_address_snapshot, customer_note, created_at, updated_at, stores(name), payments(status, confirmed_at, created_at), order_items(id, store_product_id, product_name_snapshot, unit_price, quantity, line_total, created_at)").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return { user: auth.user, order: data as unknown as Record<string, unknown> | null };
}
