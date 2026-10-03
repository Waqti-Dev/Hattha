"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function MerchantRefresh() { const router = useRouter(); const [refreshing, setRefreshing] = useState(false); useEffect(() => { const timer = window.setInterval(() => router.refresh(), 20000); const supabase = createClient(); const channel = supabase.channel("hattha-merchant-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => router.refresh()).subscribe(); return () => { window.clearInterval(timer); void supabase.removeChannel(channel); }; }, [router]); function refresh() { setRefreshing(true); router.refresh(); window.setTimeout(() => setRefreshing(false), 500); } return <button type="button" onClick={refresh} disabled={refreshing} className="rounded-xl border border-[#dce8e1] bg-white px-3 py-2 text-xs font-black text-[#27735e] disabled:opacity-50">{refreshing ? "جارٍ التحديث…" : "تحديث الطلبات"}</button>; }
