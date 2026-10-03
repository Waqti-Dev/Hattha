"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function cancel() { if (!window.confirm("هل تريد إلغاء هذا الطلب؟")) return; setLoading(true); setError(null); const response = await fetch(`/api/orders/${orderId}`, { method: "POST" }); if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error || "لا يمكن إلغاء الطلب الآن."); setLoading(false); return; } router.refresh(); }
  return <div className="mt-5 text-center"><button type="button" onClick={cancel} disabled={loading} className="text-sm font-bold text-rose-700 disabled:opacity-50">{loading ? "جارٍ الإلغاء…" : "إلغاء الطلب"}</button>{error && <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{error}</p>}</div>;
}
