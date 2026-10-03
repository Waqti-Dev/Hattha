import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Item = { storeProductId?: unknown; quantity?: unknown };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { storeId?: unknown; items?: unknown };
  if (typeof body.storeId !== "string" || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: "INVALID_ESTIMATE_REQUEST" }, { status: 400 });
  const items = body.items as Item[];
  if (items.some((item) => typeof item.storeProductId !== "string" || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) return NextResponse.json({ error: "INVALID_CART_ITEM" }, { status: 400 });
  const { data: rawStore, error: storeError } = await supabase.from("stores").select("id, is_active, is_open, operational_available").eq("id", body.storeId).maybeSingle();
  const store = rawStore as unknown as { is_active: boolean; is_open: boolean; operational_available: boolean } | null;
  if (storeError || !store || !store.is_active || !store.is_open || !store.operational_available) return NextResponse.json({ error: "STORE_NOT_AVAILABLE" }, { status: 400 });
  const ids = items.map((item) => item.storeProductId as string);
  const { data: rows, error } = await supabase.from("store_products").select("id, store_id, price, is_active, offer_products(offers(discount_type, discount_value, max_quantity))").eq("store_id", body.storeId).in("id", ids);
  if (error) return NextResponse.json({ error: "ESTIMATE_FAILED" }, { status: 400 });
  const byId = new Map((rows ?? []).map((row) => [(row as { id: string }).id, row as unknown as { id: string; price: number; is_active: boolean; offer_products: Array<{ offers: { discount_type: string; discount_value: number; max_quantity: number | null } | null }> }]));
  let subtotal = 0;
  for (const item of items) {
    const row = byId.get(item.storeProductId as string);
    if (!row || !row.is_active) return NextResponse.json({ error: "INVALID_STORE_PRODUCT" }, { status: 400 });
    const quantity = item.quantity as number;
    const effective = (row.offer_products ?? []).reduce((lowest, entry) => {
      const offer = entry.offers;
      if (!offer) return lowest;
      const discountedUnit = offer.discount_type === "PERCENTAGE" ? Math.max(0, Number(row.price) - Number(row.price) * Number(offer.discount_value) / 100) : Math.max(0, Number(row.price) - Number(offer.discount_value));
      const discountedQuantity = offer.max_quantity == null ? quantity : Math.min(quantity, Number(offer.max_quantity));
      const candidate = discountedUnit * discountedQuantity + Number(row.price) * (quantity - discountedQuantity);
      return Math.min(lowest, Number(candidate.toFixed(2)));
    }, Number(row.price) * quantity);
    subtotal += Number(effective.toFixed(2));
  }
  const { data: settings } = await supabase.from("platform_settings").select("value").eq("key", "commercial_fees").maybeSingle();
  const value = (settings as { value?: { delivery_fee?: number; customer_service_fee?: number } } | null)?.value ?? {};
  const deliveryFee = Number(value.delivery_fee ?? 0);
  const serviceFee = Number(value.customer_service_fee ?? 0);
  return NextResponse.json({ subtotal: Number(subtotal.toFixed(2)), deliveryFee, serviceFee, total: Number((subtotal + deliveryFee + serviceFee).toFixed(2)) });
}
