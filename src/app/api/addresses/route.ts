import { NextResponse } from "next/server";
import { validateAddressInput } from "@/lib/address";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const { data, error } = await supabase.from("addresses").select("id, label, address_line, area, city, location, is_default, created_at, updated_at").order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "ADDRESSES_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  const validation = validateAddressInput(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: validation.message }, { status: 400 });
  if (validation.data.isDefault) await supabase.from("addresses").update({ is_default: false } as never).eq("customer_id", auth.user.id);
  const { data, error } = await supabase.from("addresses").insert({ customer_id: auth.user.id, label: validation.data.label || null, address_line: validation.data.addressLine, area: validation.data.area, city: validation.data.city, location: validation.data.location, is_default: validation.data.isDefault } as never).select("id, label, address_line, area, city, location, is_default, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "ADDRESS_CREATE_FAILED" }, { status: 500 });
  return NextResponse.json({ address: data }, { status: 201 });
}
