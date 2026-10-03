"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGithub() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError("تعذّر بدء تسجيل الدخول. حاول مرة أخرى.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#faf8f3] px-4 text-[#173b35]">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-[#173b35]/10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e2f1e9] text-3xl font-black">ه</div>
        <h1 className="mt-6 text-3xl font-black">تسجيل الدخول إلى هاتها</h1>
        <p className="mt-3 text-sm leading-7 text-[#6a8278]">استخدم حساب GitHub للمتابعة. سيتم إنشاء ملفك كمستخدم عميل تلقائياً.</p>
        <button type="button" onClick={signInWithGithub} disabled={loading} className="mt-7 w-full rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white transition hover:bg-[#24584e] disabled:cursor-wait disabled:opacity-60">
          {loading ? "جارٍ التحويل…" : "المتابعة باستخدام GitHub"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm font-bold text-rose-700">{error}</p>}
      </section>
    </main>
  );
}
