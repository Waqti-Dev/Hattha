"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CustomerShell } from "@/components/customer-shell";
import { ThemeSelector } from "@/components/theme-selector";

export default function SettingsPage() {
  const router = useRouter();
  async function logout() { await createClient().auth.signOut(); router.push("/"); router.refresh(); }
  return <CustomerShell><section className="shell-inner max-w-2xl px-3 py-7 sm:px-0 sm:py-10"><Link href="/account" className="text-sm font-bold text-[#568171]">← العودة إلى الحساب</Link><p className="section-kicker mt-6">الحساب</p><h1 className="section-heading mt-1">الإعدادات</h1><div className="mt-6 space-y-3"><ThemeSelector /><Link href="/notifications" className="surface-card block p-4 font-black">الإشعارات <span className="mt-1 block text-sm font-normal text-[#6a8278]">راجع إشعارات الطلبات والتوصيل.</span></Link><div className="surface-card p-4"><h2 className="font-black">المعلومات القانونية والخصوصية</h2><div className="mt-3 grid gap-2 text-sm font-bold text-[#27735e]"><Link href="/privacy">سياسة الخصوصية</Link><Link href="/terms">الشروط والأحكام</Link><Link href="/cancellation">سياسة الإلغاء</Link><Link href="/refund">سياسة الاسترداد</Link></div></div><button type="button" onClick={() => void logout()} className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-right font-black text-rose-700">تسجيل الخروج</button></div></section></CustomerShell>;
}
