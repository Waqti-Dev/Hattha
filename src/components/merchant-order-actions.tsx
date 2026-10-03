"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MerchantOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function transition(action: "ACCEPT" | "REJECT" | "PREPARING" | "READY") {
    if (action === "REJECT" && !window.confirm("هل تريد رفض هذا الطلب؟")) return;
    setBusy(true); setError(null);
    const response = await fetch(`/api/merchant/orders/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, rejectionReason: action === "REJECT" ? "OTHER" : undefined }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "تعذّر تحديث حالة الطلب."); else router.refresh();
    setBusy(false);
  }
  return <div className="mt-6"><div className="flex flex-wrap gap-3">{["FINDING_STORE", "STORE_CONFIRMING"].includes(status) && <><button disabled={busy} onClick={() => transition("ACCEPT")} className="rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white disabled:opacity-50">قبول الطلب</button><button disabled={busy} onClick={() => transition("REJECT")} className="rounded-2xl border border-rose-200 px-5 py-3 font-black text-rose-700 disabled:opacity-50">رفض الطلب</button></>}{status === "ACCEPTED" && <button disabled={busy} onClick={() => transition("PREPARING")} className="rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white disabled:opacity-50">بدء التجهيز</button>}{status === "PREPARING" && <button disabled={busy} onClick={() => transition("READY")} className="rounded-2xl bg-[#173b35] px-5 py-3 font-black text-white disabled:opacity-50">جاهز للاستلام</button>}</div>{error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}</div>;
}
