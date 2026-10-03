import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OrderRequest = {
  storeId?: unknown;
  addressId?: unknown;
  paymentMethod?: unknown;
  onlinePaymentMethod?: unknown;
  customerNote?: unknown;
  items?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => null) as OrderRequest | null;
  if (!body || typeof body.storeId !== "string" || typeof body.addressId !== "string" || !Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: "INVALID_ORDER_REQUEST" }, { status: 400 });
  if (body.paymentMethod !== "COD" && body.paymentMethod !== "ONLINE") return NextResponse.json({ error: "INVALID_PAYMENT_METHOD" }, { status: 400 });
  const items = body.items.map((item) => {
    const candidate = item as { storeProductId?: unknown; quantity?: unknown };
    return { storeProductId: candidate.storeProductId, quantity: candidate.quantity };
  });
  if (items.some((item) => typeof item.storeProductId !== "string" || typeof item.quantity !== "number")) return NextResponse.json({ error: "INVALID_CART_ITEM" }, { status: 400 });
  const { data: orderId, error } = await supabase.rpc("create_customer_order" as never, {
    p_store_id: body.storeId,
    p_items: items,
    p_address_id: body.addressId,
    p_payment_method: body.paymentMethod,
    p_online_payment_method: body.paymentMethod === "ONLINE" ? body.onlinePaymentMethod : null,
    p_customer_note: typeof body.customerNote === "string" ? body.customerNote.slice(0, 500) : null,
  } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orderId });
}
