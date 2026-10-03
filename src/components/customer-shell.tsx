import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { NotificationBell } from "@/components/notification-bell";

const mobileLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/orders", label: "طلباتي" },
  { href: "/cart", label: "السلة" },
  { href: "/account", label: "حسابي" },
];

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell text-[#173b35]">
      <a href="#main-content" className="skip-link">تجاوز إلى المحتوى</a>
      <header className="site-header">
        <div className="shell-inner flex min-h-[4.35rem] items-center justify-between gap-4">
          <Link href="/" className="brand-lockup" aria-label="العودة إلى الرئيسية">
            <span className="brand-mark overflow-hidden bg-white p-1"><Image src="/hattha-brand.jpg" alt="" width={44} height={32} className="h-full w-full object-contain" /></span>
            <span><span className="brand-name">هاتها</span><span className="brand-tagline">توصيل بلطيم</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="التنقل الرئيسي">
            <Link href="/">الرئيسية</Link>
            <Link href="/orders">طلباتي</Link>
            <CartLink />
            <NotificationBell />
            <Link href="/account">حسابي</Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="pb-20 sm:pb-0">{children}</main>
      <footer className="shell-inner mt-16 border-t border-[#dce8e1] px-0 py-8 text-center text-sm text-[#6a8278] sm:mt-20">
        <p className="font-bold">هاتها — نقرّب احتياجاتك اليومية منك في بلطيم</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold">
          <Link href="/privacy">الخصوصية</Link><Link href="/terms">الشروط</Link><Link href="/cancellation">الإلغاء</Link><Link href="/refund">الاسترداد</Link><Link href="/settings">الإعدادات</Link>
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        {mobileLinks.map((item) => <Link key={item.href} href={item.href} className="mobile-nav-link">{item.label}</Link>)}
      </nav>
    </div>
  );
}
