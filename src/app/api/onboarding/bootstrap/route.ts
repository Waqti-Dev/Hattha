import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCourierApplication, validateMerchantApplication } from "@/lib/onboarding";

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });

  const metadata = auth.user.user_metadata ?? {};
  const profile = {
    full_name: typeof metadata.full_name === "string" ? metadata.full_name.trim() : typeof metadata.name === "string" ? metadata.name.trim() : null,
    phone: typeof metadata.phone === "string" ? metadata.phone.trim() : auth.user.phone ?? null,
  };
  if (profile.full_name || profile.phone) {
    await supabase.from("profiles").update(profile as never).eq("id", auth.user.id);
  }

  const role = metadata.onboarding_role;
  if (role === "MERCHANT" && metadata.merchant_application) {
    const validation = validateMerchantApplication(metadata.merchant_application);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { data: existing } = await supabase.from("merchant_applications").select("id, status").eq("applicant_id", auth.user.id).eq("status", "PENDING").maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("merchant_applications").insert({
        applicant_id: auth.user.id,
        full_name: validation.data.fullName,
        phone: validation.data.phone,
        email: validation.data.email,
        store_name: validation.data.storeName,
        store_category: validation.data.storeCategory,
        store_address: validation.data.storeAddress,
        store_phone: validation.data.storePhone,
        store_location: validation.data.storeLocation,
        business_description: validation.data.businessDescription || null,
        status: "PENDING",
      } as never);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, role, status: "PENDING" });
  }

  if (role === "COURIER" && metadata.courier_application) {
    const validation = validateCourierApplication(metadata.courier_application);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { data: existing } = await supabase.from("couriers").select("id, verification_status").eq("id", auth.user.id).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("couriers").insert({
        id: auth.user.id,
        verification_status: "PENDING_VERIFICATION",
        national_id_reference: validation.data.nationalIdReference,
        vehicle_type: validation.data.vehicleType,
        vehicle_plate: validation.data.vehiclePlate,
      } as never);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, role, status: "PENDING_VERIFICATION" });
  }

  return NextResponse.json({ ok: true, role: role ?? "CUSTOMER" });
}
