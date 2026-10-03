import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { OnboardingStatusCard } from "@/components/onboarding-status-card";
import { getAccessState } from "@/lib/access";

export const dynamic = "force-dynamic";
export default async function MerchantPendingPage() { const state = await getAccessState(); if (!state.user) redirect("/login"); if (state.role !== "MERCHANT") redirect("/"); if (state.merchantApplication?.status === "APPROVED") redirect("/merchant"); if (state.merchantApplication?.status === "REJECTED") redirect("/onboarding/merchant/rejected"); return <CustomerShell><section className="shell-inner px-3 py-10 sm:px-0 sm:py-14"><OnboardingStatusCard kind="merchant" status="pending" /></section></CustomerShell>; }
