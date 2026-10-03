"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";

type Notification = { id: string; order_id: string | null; event_type: string; title: string; body: string; read_at: string | null; created_at: string };
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { void fetch("/api/notifications", { cache: "no-store" }).then(async (response) => { const body = await response.json().catch(() => ({})); if (response.ok) setItems(body.notifications ?? []); setLoading(false); }); }, []);
  async function markAll() { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); }
  return <CustomerShell><section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/account" className="text-sm font-bold text-[#568171]">← العودة إلى الحساب</Link><div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-sm font-bold text-[#779187]">التحديثات</p><h1 className="mt-1 text-3xl font-black">الإشعارات</h1></div>{items.some((item) => !item.read_at) && <button type="button" onClick={() => void markAll()} className="text-sm font-bold text-[#27735e]">تحديد الكل كمقروء</button>}</div>{loading ? <p className="mt-8 rounded-3xl bg-white p-8 text-center text-[#6a8278]">جارٍ تحميل الإشعارات…</p> : items.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-[#c8dcd1] p-8 text-center text-[#6a8278]">لا توجد إشعارات بعد.</div> : <div className="mt-8 space-y-3">{items.map((item) => <Link key={item.id} href={item.order_id ? item.event_type === "NEW_ORDER" ? `/merchant/orders/${item.order_id}` : `/orders/${item.order_id}` : "/account"} className={`block rounded-3xl border border-[#e1ebe5] bg-white p-5 shadow-sm ${item.read_at ? "opacity-60" : ""}`}><div className="flex items-start justify-between gap-3"><h2 className="font-black">{item.title}</h2><span className="text-xs text-[#9aada5]">{new Date(item.created_at).toLocaleString("ar-EG")}</span></div><p className="mt-2 text-sm leading-7 text-[#6a8278]">{item.body}</p></Link>)}</div>}</section></CustomerShell>;
}
