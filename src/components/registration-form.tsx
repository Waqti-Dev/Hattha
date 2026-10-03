"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CourierApplicationInput, MerchantApplicationInput, OnboardingRole } from "@/lib/onboarding";

export function RegistrationForm({ role }: { role: OnboardingRole }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const field = (key: string, label: string, type = "text", required = true) => <label className="block text-sm font-bold">{label}<input required={required} type={type} value={form[key] ?? ""} onChange={set(key)} className="mt-1 w-full rounded-2xl border border-[#c8dcd1] px-4 py-3" /></label>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const auth = createClient();
    const base = { full_name: form.fullName, phone: form.phone, onboarding_role: role };
    let storeLocation: Record<string, unknown> | null = null;
    if (role === "MERCHANT" && form.storeLocation?.trim()) {
      try { storeLocation = JSON.parse(form.storeLocation) as Record<string, unknown>; } catch { setError("إحداثيات المتجر يجب أن تكون JSON صحيحة."); setLoading(false); return; }
    }
    const metadata = role === "MERCHANT" ? { ...base, merchant_application: {
      fullName: form.fullName, phone: form.phone, email: form.email, storeName: form.storeName, storeCategory: form.storeCategory,
      storeAddress: form.storeAddress, storePhone: form.storePhone, storeLocation, businessDescription: form.businessDescription,
    } satisfies Partial<MerchantApplicationInput> } : role === "COURIER" ? { ...base, courier_application: {
      fullName: form.fullName, phone: form.phone, email: form.email, nationalIdReference: form.nationalIdReference,
      vehicleType: form.vehicleType, vehiclePlate: form.vehiclePlate,
    } satisfies Partial<CourierApplicationInput> } : base;
    const { data, error: authError } = await auth.auth.signUp({ email: form.email, password: form.password, options: { data: metadata, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(role === "MERCHANT" ? "/merchant" : role === "COURIER" ? "/account" : "/addresses")}` } });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.session) {
      await fetch("/api/onboarding/bootstrap", { method: "POST" });
      router.push(role === "MERCHANT" ? "/merchant" : role === "COURIER" ? "/account" : "/addresses");
      router.refresh();
    } else {
      setMessage("تم إنشاء طلب التسجيل. راجع بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول لإكمال الخطوات.");
    }
    setLoading(false);
  }

  const title = role === "CUSTOMER" ? "إنشاء حساب عميل" : role === "MERCHANT" ? "طلب تسجيل متجر" : "طلب تسجيل مندوب";
  return <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14"><div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-[#173b35]/10 sm:p-8"><p className="text-sm font-bold text-[#779187]">إنشاء حساب</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-3 text-sm leading-7 text-[#6a8278]">سيتم استخدام هوية Supabase واحدة، ولن يتم منح صلاحيات التاجر أو المندوب قبل اعتمادها.</p><form onSubmit={submit} className="mt-7 space-y-4">{field("fullName", "الاسم الكامل")}{field("phone", "رقم الهاتف", "tel")}{field("email", "البريد الإلكتروني", "email")}{role === "MERCHANT" && <>{field("storeName", "اسم المتجر")}{field("storeCategory", "تصنيف المتجر")}{field("storeAddress", "عنوان المتجر")}{field("storePhone", "هاتف المتجر", "tel")}{field("businessDescription", "وصف المتجر (اختياري)", "text", false)}<label className="block text-sm font-bold">إحداثيات المتجر (اختياري)<textarea value={form.storeLocation ?? ""} onChange={set("storeLocation")} placeholder='{"lat": 31.0, "lng": 31.0}' className="mt-1 min-h-20 w-full rounded-2xl border border-[#c8dcd1] px-4 py-3" /></label></>}{role === "COURIER" && <>{field("nationalIdReference", "مرجع بيانات الهوية")}{field("vehicleType", "نوع المركبة")}{field("vehiclePlate", "رقم اللوحة")}</>}{field("password", "كلمة المرور", "password")}<button disabled={loading} className="w-full rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white disabled:opacity-60">{loading ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}</button></form>{message && <p className="mt-4 rounded-2xl bg-[#e2f1e9] p-4 text-sm font-bold text-[#27735e]">{message}</p>}{error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}<p className="mt-6 text-center text-sm text-[#6a8278]">لديك حساب؟ <Link href="/login" className="font-black text-[#173b35] underline">تسجيل الدخول</Link></p></div></main>;
}
