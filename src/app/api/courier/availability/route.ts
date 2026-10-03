import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { available?: unknown };
  if (typeof body.available !== "boolean") return NextResponse.json({ error: "AVAILABILITY_REQUIRED" }, { status: 400 });
  const { data, error } = await supabase.rpc("courier_set_availability" as never, { p_is_available: body.available } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ available: data });
}
