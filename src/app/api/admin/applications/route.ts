import { NextResponse } from "next/server";
import { adminAction } from "@/lib/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { action?: unknown; id?: unknown; reviewNote?: unknown };
  if (!["approve-merchant", "reject-merchant", "approve-courier", "reject-courier"].includes(String(body.action)) || typeof body.id !== "string") {
    return NextResponse.json({ error: "ADMIN_ACTION_REQUIRED" }, { status: 400 });
  }
  const note = typeof body.reviewNote === "string" ? body.reviewNote.slice(0, 500) : undefined;
  try {
    const { error } = await adminAction(body.action as Parameters<typeof adminAction>[0], body.id, note);
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ADMIN_ACTION_FAILED" }, { status: 403 });
  }
}
