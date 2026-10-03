"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = { id: string; order_id: string | null; event_type: string; title: string; body: string; read_at: string | null; created_at: string };

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.read_at).length;
  async function load() { const response = await fetch("/api/notifications", { cache: "no-store" }); if (!response.ok) return; const body = await response.json(); setItems(body.notifications ?? []); }
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15000);
    const supabase = createClient();
    const channel = supabase.channel("hattha-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { void load(); router.refresh(); }).subscribe();
    return () => { window.clearTimeout(initial); window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [router]);
  async function markAll() { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); }
  function href(item: Notification) { return item.order_id ? item.event_type === "NEW_ORDER" ? `/merchant/orders/${item.order_id}` : `/orders/${item.order_id}` : "/account"; }
  return <div className="relative"><button type="button" onClick={() => setOpen(!open)} aria-label="الإشعارات" aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce8e1] bg-white text-lg hover:bg-[#f5faf7]">♢{unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#d65c4a] px-1 text-[10px] font-black text-white">{unread > 9 ? "9+" : unread}</span>}</button>{open && <div className="absolute left-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-[#dce8e1] bg-white p-3 text-right shadow-2xl"><div className="flex items-center justify-between gap-3 px-2 py-2"><strong>الإشعارات</strong>{unread > 0 && <button type="button" onClick={() => void markAll()} className="text-xs font-bold text-[#27735e]">تحديد الكل كمقروء</button>}</div>{items.length === 0 ? <p className="p-5 text-center text-sm text-[#6a8278]">لا توجد إشعارات جديدة.</p> : <div className="max-h-80 space-y-1 overflow-auto">{items.slice(0, 10).map((item) => <Link key={item.id} href={href(item)} onClick={() => setOpen(false)} className={`block rounded-2xl p-3 hover:bg-[#f5faf7] ${item.read_at ? "opacity-60" : "bg-[#f5faf7]"}`}><p className="text-sm font-black">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#6a8278]">{item.body}</p><p className="mt-1 text-[10px] text-[#9aada5]">{new Date(item.created_at).toLocaleString("ar-EG")}</p></Link>)}</div>}</div>}</div>;
}
