import { NextResponse } from "next/server";
import { validateAddressInput } from "@/lib/address";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ addressId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { addressId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const validation = validateAddressInput(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
  if (validation.data.isDefault) await supabase.from("addresses").update({ is_default: false } as never).eq("customer_id", auth.user.id).neq("id", addressId);
  const { data, error } = await supabase.from("addresses").update({ label: validation.data.label || null, address_line: validation.data.addressLine, area: validation.data.area, city: validation.data.city, location: validation.data.location, is_default: validation.data.isDefault } as never).eq("id", addressId).select("id, label, address_line, area, city, location, is_default, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "ADDRESS_UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ address: data });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { addressId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { error } = await supabase.from("addresses").delete().eq("id", addressId);
  if (error) return NextResponse.json({ error: "ADDRESS_DELETE_FAILED" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
