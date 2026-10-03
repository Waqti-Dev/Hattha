import { redirect } from "next/navigation";
import Image from "next/image";
import { AdminApplicationList } from "@/components/admin-application-list";
import { CustomerShell } from "@/components/customer-shell";
import { getAdminDashboard } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();
  if (!dashboard.state.user) redirect("/login?next=/admin");
  if (!dashboard.authorized) redirect("/");
  const pendingMerchants = dashboard.merchants.filter((item) => item.status === "PENDING").length;
  const pendingCouriers = dashboard.couriers.filter((item) => item.verification_status === "PENDING_VERIFICATION").length;
  const approvedMerchants = dashboard.merchants.filter((item) => item.status === "APPROVED").length;
  const approvedCouriers = dashboard.couriers.filter((item) => item.verification_status === "VERIFIED").length;
  return <CustomerShell><section className="shell-inner px-3 py-7 sm:px-0 sm:py-10"><div className="hero-panel flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><p className="text-sm font-bold text-[#ffb4a6]">إدارة هاتها</p><h1 className="mt-2 text-3xl font-black">لوحة التشغيل</h1><p className="mt-2 text-sm leading-7 text-[#ffdad3]">راجع طلبات الانضمام واعتمد المتاجر والمندوبين من مكان واحد.</p></div><Image src="/hattha-brand.jpg" alt="هاتها" width={132} height={72} className="h-16 w-auto rounded-lg bg-white object-contain p-1" priority /></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="surface-card p-4"><p className="text-xs text-[#57534e]">متاجر معلقة</p><strong className="mt-2 block text-2xl text-[#b51d04]">{pendingMerchants}</strong></div><div className="surface-card p-4"><p className="text-xs text-[#57534e]">مندوبون قيد التحقق</p><strong className="mt-2 block text-2xl text-[#895100]">{pendingCouriers}</strong></div><div className="surface-card p-4"><p className="text-xs text-[#57534e]">متاجر معتمدة</p><strong className="mt-2 block text-2xl text-[#006948]">{approvedMerchants}</strong></div><div className="surface-card p-4"><p className="text-xs text-[#57534e]">مندوبون معتمدون</p><strong className="mt-2 block text-2xl text-[#006948]">{approvedCouriers}</strong></div></div><div className="mt-4 rounded-lg border border-[#e4beb6] bg-[#fff7ed] p-4 text-sm text-[#663b00]">إجمالي الطلبات المسجلة: <strong>{dashboard.metrics?.orderCount ?? 0}</strong>. هذه أرقام من قاعدة البيانات وليست بيانات تجريبية.</div><div className="mt-10"><AdminApplicationList merchants={dashboard.merchants} couriers={dashboard.couriers} /></div></section></CustomerShell>;
}
