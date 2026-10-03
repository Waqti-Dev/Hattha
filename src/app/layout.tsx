import type { Metadata } from "next";
import { Cairo, Geist_Mono, Tajawal } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const tajawal = Tajawal({ variable: "--font-tajawal", subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"] });
const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], weight: ["600", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "هاتها | توصيل محلي في بلطيم",
  description: "اكتشف المتاجر والمنتجات المتاحة للتوصيل في بلطيم.",
};

const themeBootstrap = `(() => { try { const saved = localStorage.getItem('hattha-theme'); const theme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'; const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.dataset.theme = theme; } catch (_) {} })()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${tajawal.variable} ${cairo.variable} ${geistMono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-full"><ThemeProvider><CartProvider>{children}</CartProvider></ThemeProvider></body>
    </html>
  );
}
