import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data: courier } = await supabase.from("couriers").select("verification_status").eq("id", auth.user.id).maybeSingle();
  if (!courier || (courier as { verification_status?: string }).verification_status !== "VERIFIED") return NextResponse.json({ error: "COURIER_NOT_VERIFIED" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { available?: unknown };
  if (typeof body.available !== "boolean") return NextResponse.json({ error: "AVAILABILITY_REQUIRED" }, { status: 400 });
  const { data, error } = await supabase.rpc("courier_set_availability" as never, { p_is_available: body.available } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ available: data });
}
