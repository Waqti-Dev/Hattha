import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#173b35]">
      <header className="sticky top-0 z-10 border-b border-[#dce8e1] bg-[#faf8f3]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="العودة إلى الرئيسية"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e2f1e9] text-xl">ه</span><span><span className="block text-lg font-black tracking-tight">هاتها</span><span className="block text-[11px] text-[#6a8278]">توصيل بلطيم</span></span></Link>
          <nav className="flex items-center gap-1 text-sm font-bold" aria-label="التنقل الرئيسي"><Link href="/" className="rounded-xl px-2 py-2 hover:bg-white">الرئيسية</Link><CartLink /><Link href="/account" className="rounded-xl px-2 py-2 hover:bg-white">حسابي</Link></nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mx-auto mt-16 max-w-6xl border-t border-[#dce8e1] px-4 py-8 text-center text-sm text-[#6a8278] sm:px-6">هاتها — نقرّب احتياجاتك اليومية منك في بلطيم</footer>
    </div>
  );
}
