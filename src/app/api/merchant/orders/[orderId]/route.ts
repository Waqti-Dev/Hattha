import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { orderId } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown; rejectionReason?: unknown } | null;
  if (!body || typeof body.action !== "string" || !["ACCEPT", "REJECT", "PREPARING", "READY"].includes(body.action)) return NextResponse.json({ error: "INVALID_MERCHANT_ACTION" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data: status, error } = await supabase.rpc("merchant_update_order_status" as never, { p_order_id: orderId, p_action: body.action, p_rejection_reason: typeof body.rejectionReason === "string" ? body.rejectionReason : "OTHER" } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status });
}
