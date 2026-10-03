import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";

const options = [
  { href: "/register/customer", icon: "👤", title: "عميل", text: "تصفح المتاجر، أضف عناوينك، واطلب بالدفع عند الاستلام." },
  { href: "/register/merchant", icon: "🏪", title: "متجر / تاجر", text: "قدّم بيانات متجرك وانتظر اعتماد الحساب قبل إدارة المنتجات والطلبات." },
  { href: "/register/courier", icon: "🛺", title: "مندوب توصيل", text: "قدّم بيانات المركبة والتحقق، ثم انتظر مراجعة فريق هاتها." },
];

export default function RegisterPage() {
  return <CustomerShell><section className="mx-auto max-w-4xl px-4 py-10 sm:py-16"><div className="text-center"><p className="text-sm font-bold text-[#779187]">حساب جديد</p><h1 className="mt-2 text-4xl font-black">إنشاء حساب</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#6a8278]">اختر الطريقة التي ستستخدم بها هاتها. كل الحسابات تعتمد على هوية Supabase واحدة وصلاحيات قاعدة البيانات.</p></div><div className="mt-8 grid gap-4 md:grid-cols-3">{options.map((option) => <Link key={option.href} href={option.href} className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className="text-3xl">{option.icon}</span><h2 className="mt-5 text-xl font-black">{option.title}</h2><p className="mt-2 text-sm leading-7 text-[#6a8278]">{option.text}</p><span className="mt-5 inline-flex rounded-2xl bg-[#e2f1e9] px-4 py-2 text-sm font-black text-[#27735e]">ابدأ التسجيل</span></Link>)}</div><p className="mt-8 text-center text-sm text-[#6a8278]">لديك حساب بالفعل؟ <Link href="/login" className="font-black text-[#173b35] underline">تسجيل الدخول</Link></p></section></CustomerShell>;
}
