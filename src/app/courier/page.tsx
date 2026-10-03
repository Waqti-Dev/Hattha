import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { CourierDashboard } from "@/components/courier-dashboard";
import { OnboardingStatusCard } from "@/components/onboarding-status-card";
import { getAccessState } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function CourierPage() {
  const access = await getAccessState();
  if (!access.user) return <CustomerShell><section className="shell-inner px-3 py-10"><div className="surface-card p-8 text-center"><p className="font-black">سجّل الدخول للوصول إلى مهام التوصيل.</p><Link href="/login?next=/courier" className="btn-primary mt-5 inline-flex">تسجيل الدخول</Link></div></section></CustomerShell>;
  if (access.role !== "COURIER") return <CustomerShell><section className="shell-inner px-3 py-10"><div className="surface-card p-8 text-center"><p className="font-black">لا تملك صلاحية الوصول إلى مساحة المندوب.</p><Link href={access.role === "ADMIN" ? "/admin" : "/account"} className="btn-primary mt-5 inline-flex">العودة</Link></div></section></CustomerShell>;
  if (access.courier?.verification_status === "REJECTED") return <CustomerShell><section className="shell-inner px-3 py-10 sm:px-0 sm:py-14"><OnboardingStatusCard kind="courier" status="rejected" /></section></CustomerShell>;
  if (access.courier?.verification_status !== "VERIFIED") return <CustomerShell><section className="shell-inner px-3 py-10 sm:px-0 sm:py-14"><OnboardingStatusCard kind="courier" status="pending" /></section></CustomerShell>;
  return <CustomerShell><section className="shell-inner px-3 py-7 sm:px-0 sm:py-10"><Link href="/account" className="text-sm font-bold text-[#568171]">← العودة إلى الحساب</Link><div className="mt-6"><p className="section-kicker">التوصيل</p><h1 className="section-heading mt-1">مهام التوصيل</h1><p className="mt-2 text-sm leading-7 text-[#57534e]">لا تُظهر هذه المساحة سوى بيانات العميل والعنوان اللازمة لإتمام التوصيل.</p></div><div className="mt-6"><CourierDashboard /></div></section></CustomerShell>;
}
