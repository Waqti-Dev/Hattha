import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ storeId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { storeId } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const body = await request.json();
  const { error } = await supabase.rpc("merchant_update_store", {
    p_store_id: storeId,
    p_name: String(body.name ?? ""),
    p_category: String(body.category ?? ""),
    p_address: String(body.address ?? ""),
    p_phone: String(body.phone ?? ""),
    p_location: body.location ?? null,
    p_description: String(body.description ?? ""),
  } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
