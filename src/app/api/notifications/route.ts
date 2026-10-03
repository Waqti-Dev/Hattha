import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data, error } = await supabase
    .from("notifications")
    .select("id, order_id, event_type, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: "NOTIFICATIONS_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [], unreadCount: (data ?? []).filter((item) => !(item as { read_at: string | null }).read_at).length });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown; all?: unknown };
  const query = supabase.from("notifications").update({ read_at: new Date().toISOString() } as never);
  const { error } = body.all === true || typeof body.id !== "string"
    ? await query.is("read_at", null)
    : await query.eq("id", body.id);
  if (error) return NextResponse.json({ error: "NOTIFICATION_UPDATE_FAILED" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
