import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { NotificationBell } from "@/components/notification-bell";

const mobileLinks = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/orders", label: "طلباتي", icon: "◷" },
  { href: "/cart", label: "السلة", icon: "▱" },
  { href: "/account", label: "حسابي", icon: "♙" },
];

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">تجاوز إلى المحتوى</a>
      <header className="site-header">
        <div className="shell-inner flex min-h-[4.35rem] items-center justify-between gap-4">
          <Link href="/" className="brand-lockup" aria-label="العودة إلى هاتها">
            <span className="brand-mark"><Image src="/hattha-logo.jpg" alt="" width={44} height={48} className="h-full w-full object-contain" /></span>
            <span><span className="brand-name">هاتها</span><span className="brand-tagline">توصيل محلي في بلطيم</span></span>
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
      <footer className="shell-inner mt-16 border-t border-[var(--border)] px-0 py-8 text-center text-sm text-[var(--muted)] sm:mt-20">
        <p className="font-bold">هاتها — احتياجاتك اليومية أقرب إليك</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold">
          <Link href="/privacy">الخصوصية</Link><Link href="/terms">الشروط</Link><Link href="/cancellation">الإلغاء</Link><Link href="/refund">الاسترداد</Link><Link href="/settings">الإعدادات</Link>
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        {mobileLinks.map((item) => <Link key={item.href} href={item.href} className="mobile-nav-link"><span aria-hidden="true" className="text-base leading-none">{item.icon}</span><span>{item.label}</span></Link>)}
      </nav>
    </div>
  );
}
