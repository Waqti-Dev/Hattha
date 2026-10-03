import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function target(body: { storeId?: unknown; storeProductId?: unknown }) {
  const storeId = typeof body.storeId === "string" ? body.storeId : null;
  const storeProductId = typeof body.storeProductId === "string" ? body.storeProductId : null;
  if ((storeId ? 1 : 0) + (storeProductId ? 1 : 0) !== 1) return null;
  return { storeId, storeProductId };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const storeId = params.get("storeId");
  const storeProductId = params.get("storeProductId");
  const query = supabase.from("customer_favorites").select("id, store_id, store_product_id, created_at").order("created_at", { ascending: false });
  const { data, error } = storeId ? await query.eq("store_id", storeId) : storeProductId ? await query.eq("store_product_id", storeProductId) : await query;
  if (error) return NextResponse.json({ error: "FAVORITES_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { storeId?: unknown; storeProductId?: unknown };
  const selected = target(body);
  if (!selected) return NextResponse.json({ error: "FAVORITE_TARGET_REQUIRED" }, { status: 400 });
  const { data, error } = await supabase.from("customer_favorites").insert({ customer_id: auth.user.id, store_id: selected.storeId, store_product_id: selected.storeProductId } as never).select("id, store_id, store_product_id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "ALREADY_FAVORITED" : "FAVORITE_CREATE_FAILED" }, { status: 400 });
  return NextResponse.json({ favorite: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const storeId = params.get("storeId");
  const storeProductId = params.get("storeProductId");
  if (!storeId && !storeProductId) return NextResponse.json({ error: "FAVORITE_TARGET_REQUIRED" }, { status: 400 });
  const query = supabase.from("customer_favorites").delete();
  const { error } = storeId ? await query.eq("store_id", storeId) : await query.eq("store_product_id", storeProductId as string);
  if (error) return NextResponse.json({ error: "FAVORITE_DELETE_FAILED" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
