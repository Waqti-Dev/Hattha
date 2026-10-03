"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OrderLiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 20000);
    const supabase = createClient();
    const channel = supabase.channel(`hattha-order-${orderId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => router.refresh()).subscribe();
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [orderId, router]);
  return null;
}
