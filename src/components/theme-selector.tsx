"use client";

import { useTheme } from "@/components/theme-provider";

type Theme = "light" | "dark" | "system";
const options: Array<{ value: Theme; label: string }> = [
  { value: "system", label: "الجهاز" },
  { value: "light", label: "فاتح" },
  { value: "dark", label: "داكن" },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  return <div className="flex flex-col gap-4 rounded-2xl border border-[#dce8e1] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="block">المظهر</strong><span className="mt-1 block text-sm text-[#6a8278]">اختر الوضع الفاتح أو الداكن أو حسب الجهاز.</span></div><div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f5faf7] p-1" role="group" aria-label="اختيار المظهر">{options.map((option) => <button key={option.value} type="button" onClick={() => setTheme(option.value)} aria-pressed={theme === option.value} className={`rounded-lg px-3 py-2 text-xs font-black ${theme === option.value ? "bg-white text-[#173b35] shadow-sm" : "text-[#6a8278]"}`}>{option.label}</button>)}</div></div>;
}
