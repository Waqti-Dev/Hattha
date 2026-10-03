import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { getCurrentUser } from "@/lib/customer";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  return (
    <CustomerShell>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-sm font-bold text-[#779187]">حسابك</p>
        <h1 className="mt-2 text-3xl font-black">مرحباً بك في هاتها</h1>
        <div className="mt-8 rounded-3xl border border-[#e1ebe5] bg-white p-6 shadow-sm">
          {user ? (
            <>
              <p className="font-bold">أنت مسجّل الدخول</p>
              <p className="mt-2 text-sm text-[#6a8278]">{user.email || "حساب هاتها"}</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
                <Link href="/addresses" className="rounded-xl bg-[#e6f2eb] px-4 py-2 text-[#27735e]">عناويني</Link>
                <Link href="/orders" className="rounded-xl bg-[#e6f2eb] px-4 py-2 text-[#27735e]">طلباتي</Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-bold">سجّل الدخول لحفظ عناوينك ومتابعة طلباتك.</p>
              <Link href="/login" className="mt-5 inline-flex rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white">تسجيل الدخول</Link>
            </>
          )}
        </div>
      </section>
    </CustomerShell>
  );
}
