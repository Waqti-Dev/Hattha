"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  return <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#dce8e1] bg-white p-4"><span><strong className="block">المظهر</strong><span className="mt-1 block text-sm text-[#6a8278]">اختر الوضع الفاتح أو الداكن أو حسب الجهاز.</span></span><select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")} className="rounded-xl border border-[#dce8e1] bg-white px-3 py-2 font-bold"><option value="system">حسب الجهاز</option><option value="light">فاتح</option><option value="dark">داكن</option></select></label>;
}
