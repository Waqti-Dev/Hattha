import { createClient } from "@/lib/supabase/server";
import { getAccessState } from "@/lib/access";

export type AdminMerchantApplication = { id: string; applicant_id: string; full_name: string; store_name: string; phone: string; created_at: string; status: string };
export type AdminCourierApplication = { id: string; full_name: string | null; phone: string | null; vehicle_type: string | null; vehicle_plate: string | null; created_at: string; verification_status: string };

export async function getAdminDashboard() {
  const state = await getAccessState();
  if (!state.user || state.role !== "ADMIN") return { state, authorized: false as const, merchants: [], couriers: [], metrics: null };
  const supabase = await createClient();
  const [{ data: merchants, error: merchantsError }, { data: couriers, error: couriersError }, { count: orderCount }] = await Promise.all([
    supabase.from("merchant_applications").select("id, applicant_id, full_name, store_name, phone, created_at, status").order("created_at", { ascending: false }).limit(100),
    supabase.from("couriers").select("id, vehicle_type, vehicle_plate, verification_status, created_at, profiles(full_name, phone)").order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("id", { count: "exact", head: true }).limit(1),
  ]);
  if (merchantsError) throw new Error(merchantsError.message);
  if (couriersError) throw new Error(couriersError.message);
  const courierRows = (couriers ?? []).map((row) => {
    const source = row as unknown as { id: string; vehicle_type: string | null; vehicle_plate: string | null; verification_status: string; created_at: string; profiles: { full_name: string | null; phone: string | null } | null };
    return { id: source.id, full_name: source.profiles?.full_name ?? null, phone: source.profiles?.phone ?? null, vehicle_type: source.vehicle_type, vehicle_plate: source.vehicle_plate, created_at: source.created_at, verification_status: source.verification_status };
  });
  return { state, authorized: true as const, merchants: (merchants ?? []) as unknown as AdminMerchantApplication[], couriers: courierRows, metrics: { orderCount: orderCount ?? 0 } };
}

export async function adminAction(action: "approve-merchant" | "reject-merchant" | "approve-courier" | "reject-courier", id: string, reviewNote?: string) {
  const state = await getAccessState();
  if (!state.user || state.role !== "ADMIN") throw new Error("ADMIN_AUTHENTICATION_REQUIRED");
  const supabase = await createClient();
  if (action === "approve-merchant") return supabase.rpc("approve_merchant_application" as never, { p_application_id: id } as never);
  if (action === "reject-merchant") return supabase.rpc("reject_merchant_application" as never, { p_application_id: id, p_review_note: reviewNote ?? null } as never);
  if (action === "approve-courier") return supabase.rpc("approve_courier_application" as never, { p_courier_id: id } as never);
  return supabase.rpc("reject_courier_application" as never, { p_courier_id: id, p_review_note: reviewNote ?? null } as never);
}
