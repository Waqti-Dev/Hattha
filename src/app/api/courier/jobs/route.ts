import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data: courier } = await supabase.from("couriers").select("is_available, verification_status").eq("id", auth.user.id).maybeSingle();
  if (!courier) return NextResponse.json({ error: "COURIER_PROFILE_REQUIRED" }, { status: 403 });
  const { data: jobs, error } = await supabase.rpc("courier_list_delivery_jobs" as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ jobs: jobs ?? [], available: Boolean((courier as { is_available?: boolean }).is_available), verified: (courier as { verification_status?: string }).verification_status === "VERIFIED" });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { action?: unknown; deliveryId?: unknown };
  if (typeof body.action !== "string" || typeof body.deliveryId !== "string") return NextResponse.json({ error: "DELIVERY_ACTION_REQUIRED" }, { status: 400 });
  let data: unknown; let error: { message: string } | null = null;
  if (body.action === "CLAIM") ({ data, error } = await supabase.rpc("courier_claim_delivery" as never, { p_delivery_id: body.deliveryId } as never));
  else if (body.action === "DECLINE") ({ data, error } = await supabase.rpc("courier_decline_delivery" as never, { p_delivery_id: body.deliveryId } as never));
  else if (["GOING_TO_STORE", "AT_STORE", "PICKUP", "GO_TO_CUSTOMER", "ARRIVED"].includes(body.action)) ({ data, error } = await supabase.rpc("courier_update_delivery" as never, { p_delivery_id: body.deliveryId, p_action: body.action } as never));
  else return NextResponse.json({ error: "UNKNOWN_DELIVERY_ACTION" }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
