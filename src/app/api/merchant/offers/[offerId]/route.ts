import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ offerId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { offerId } = await context.params;
  const body = await request.json();
  const discountType = body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE";
  const discountValue = Number(body.discountValue);
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (!body.name || !Number.isFinite(discountValue) || discountValue < 0 || (discountType === "PERCENTAGE" && discountValue > 100) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return NextResponse.json({ error: "INVALID_OFFER" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data: current, error: readError } = await supabase.from("offers").select("id, store_id").eq("id", offerId).maybeSingle();
  if (readError || !current) return NextResponse.json({ error: readError?.message ?? "OFFER_NOT_FOUND" }, { status: 404 });
  const { error } = await supabase.from("offers").update({ name: String(body.name), discount_type: discountType, discount_value: discountValue, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), max_quantity: body.maxQuantity ? Number(body.maxQuantity) : null, is_active: body.isActive !== false } as never).eq("id", offerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const { offerId } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { error } = await supabase.from("offers").update({ is_active: false } as never).eq("id", offerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
