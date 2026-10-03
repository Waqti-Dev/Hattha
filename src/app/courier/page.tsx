import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { CourierDashboard } from "@/components/courier-dashboard";

export const dynamic = "force-dynamic";

export default function CourierPage() {
  return <CustomerShell><section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/account" className="text-sm font-bold text-[#568171]">← العودة إلى الحساب</Link><div className="mt-6"><p className="text-sm font-bold text-[#779187]">التوصيل</p><h1 className="mt-1 text-3xl font-black">مهام التوصيل</h1><p className="mt-2 text-sm leading-7 text-[#6a8278]">لا تُظهر هذه المساحة سوى بيانات العميل والعنوان اللازمة لإتمام التوصيل.</p></div><div className="mt-6"><CourierDashboard /></div></section></CustomerShell>;
}
