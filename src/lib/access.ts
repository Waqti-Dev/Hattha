import { createClient } from "@/lib/supabase/server";

export type AccessState = {
  user: { id: string; email?: string | null } | null;
  roles: string[];
  role: "ADMIN" | "MERCHANT" | "COURIER" | "CUSTOMER";
  merchantApplication: { id: string; store_name: string; status: string; created_at: string; review_note?: string | null } | null;
  courier: { id: string; verification_status: string; verification_note?: string | null } | null;
};

export async function getAccessState(): Promise<AccessState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { user: null, roles: [], role: "CUSTOMER", merchantApplication: null, courier: null };

  const [{ data: roleRows }, { data: merchantApplication }, { data: courier }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("merchant_applications").select("id, store_name, status, created_at, review_note").eq("applicant_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("couriers").select("id, verification_status, verification_note").eq("id", auth.user.id).maybeSingle(),
  ]);
  const roles = (roleRows ?? []).map((row) => String((row as { role: string }).role));
  const role = roles.includes("ADMIN") ? "ADMIN" : roles.includes("MERCHANT") || merchantApplication ? "MERCHANT" : roles.includes("COURIER") || courier ? "COURIER" : "CUSTOMER";
  return { user: { id: auth.user.id, email: auth.user.email }, roles, role, merchantApplication: merchantApplication as AccessState["merchantApplication"], courier: courier as AccessState["courier"] };
}

export function getHomePath(state: AccessState) {
  if (!state.user) return "/login";
  if (state.role === "ADMIN") return "/admin";
  if (state.role === "MERCHANT") return state.merchantApplication?.status === "REJECTED" ? "/onboarding/merchant/rejected" : state.merchantApplication?.status === "PENDING" ? "/onboarding/merchant/pending" : "/merchant";
  if (state.role === "COURIER") return state.courier?.verification_status === "REJECTED" ? "/onboarding/courier/rejected" : state.courier?.verification_status === "VERIFIED" ? "/courier" : "/onboarding/courier/pending";
  return "/";
}

export function isApprovedMerchant(state: AccessState) {
  return state.role === "MERCHANT" && state.merchantApplication?.status === "APPROVED";
}

export function isApprovedCourier(state: AccessState) {
  return state.role === "COURIER" && state.courier?.verification_status === "VERIFIED";
}
