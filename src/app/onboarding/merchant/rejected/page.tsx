import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { OnboardingStatusCard } from "@/components/onboarding-status-card";
import { getAccessState } from "@/lib/access";

export const dynamic = "force-dynamic";
export default async function MerchantRejectedPage() { const state = await getAccessState(); if (!state.user) redirect("/login"); if (state.role !== "MERCHANT" || state.merchantApplication?.status !== "REJECTED") redirect(state.role === "MERCHANT" ? "/merchant" : "/"); return <CustomerShell><section className="shell-inner px-3 py-10 sm:px-0 sm:py-14"><OnboardingStatusCard kind="merchant" status="rejected" /></section></CustomerShell>; }
