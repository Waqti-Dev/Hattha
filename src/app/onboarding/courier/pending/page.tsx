import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { OnboardingStatusCard } from "@/components/onboarding-status-card";
import { getAccessState } from "@/lib/access";

export const dynamic = "force-dynamic";
export default async function CourierPendingPage() { const state = await getAccessState(); if (!state.user) redirect("/login"); if (state.role !== "COURIER") redirect("/"); if (state.courier?.verification_status === "VERIFIED") redirect("/courier"); if (state.courier?.verification_status === "REJECTED") redirect("/onboarding/courier/rejected"); return <CustomerShell><section className="shell-inner px-3 py-10 sm:px-0 sm:py-14"><OnboardingStatusCard kind="courier" status="pending" /></section></CustomerShell>; }
