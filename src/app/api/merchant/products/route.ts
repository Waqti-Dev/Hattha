import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "STORE_REQUIRED" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data: staff } = await supabase.from("store_staff").select("store_id").eq("store_id", storeId).eq("user_id", auth.user.id).maybeSingle();
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "MERCHANT").maybeSingle();
  if (!staff || !role) return NextResponse.json({ error: "MERCHANT_STORE_ACCESS_DENIED" }, { status: 403 });
  const { data, error } = await supabase.from("store_products").select("id, store_id, product_id, price, is_active, products(id, name, category, description)").eq("store_id", storeId).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: inventory, error: inventoryError } = await supabase.from("inventory").select("product_id, status, quantity").eq("store_id", storeId);
  if (inventoryError) return NextResponse.json({ error: inventoryError.message }, { status: 400 });
  const productRows = (data ?? []) as unknown as Array<Record<string, unknown> & { product_id: string }>;
  const inventoryRows = (inventory ?? []) as unknown as Array<{ product_id: string; status: string; quantity: number | null }>;
  const inventoryByProduct = new Map(inventoryRows.map((row) => [row.product_id, { status: row.status, quantity: row.quantity }]));
  return NextResponse.json({ products: productRows.map((row) => ({ ...row, inventory: inventoryByProduct.get(row.product_id) ?? null })) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json();
  if (!body.storeId || !body.name || Number(body.price) < 0 || Number(body.quantity) < 0) return NextResponse.json({ error: "INVALID_PRODUCT" }, { status: 400 });
  const { data, error } = await supabase.rpc("merchant_upsert_product", {
    p_store_id: body.storeId,
    p_product_id: body.storeProductId ?? null,
    p_name: String(body.name),
    p_category: String(body.category ?? ""),
    p_description: String(body.description ?? ""),
    p_price: Number(body.price),
    p_is_active: body.isActive !== false,
    p_inventory_status: body.status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
    p_quantity: Number(body.quantity),
  } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ storeProductId: data });
}
