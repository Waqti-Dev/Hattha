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
  const { data, error } = await supabase.from("offers").select("id, store_id, name, discount_type, discount_value, starts_at, ends_at, max_quantity, is_active, offer_products(store_product_id)").eq("store_id", storeId).order("starts_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json();
  const discountType = body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE";
  const discountValue = Number(body.discountValue);
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (!body.storeId || !body.name || !Number.isFinite(discountValue) || discountValue < 0 || (discountType === "PERCENTAGE" && discountValue > 100) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || !Array.isArray(body.storeProductIds) || body.storeProductIds.length === 0) return NextResponse.json({ error: "INVALID_OFFER" }, { status: 400 });
  const { data: rawOffer, error } = await supabase.from("offers").insert({ store_id: body.storeId, name: String(body.name), discount_type: discountType, discount_value: discountValue, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), max_quantity: body.maxQuantity ? Number(body.maxQuantity) : null, is_active: body.isActive !== false } as never).select("id").single();
  const offer = rawOffer as unknown as { id: string } | null;
  if (error || !offer) return NextResponse.json({ error: error?.message ?? "OFFER_CREATE_FAILED" }, { status: 400 });
  const { error: linkError } = await supabase.from("offer_products").insert(body.storeProductIds.map((storeProductId: string) => ({ offer_id: offer.id, store_product_id: storeProductId })) as never);
  if (linkError) {
    await supabase.from("offers").delete().eq("id", offer.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }
  return NextResponse.json({ offerId: offer.id });
}
