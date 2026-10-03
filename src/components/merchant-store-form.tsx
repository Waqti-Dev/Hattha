"use client";

import { useState } from "react";

export function MerchantStoreForm({ store }: { store: { id: string; name: string; address: string; category?: string | null; phone?: string | null; description?: string | null } }) {
  const [form, setForm] = useState({ name: store.name, address: store.address, phone: store.phone ?? "", description: store.description ?? "", category: store.category ?? "" }); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) { event.preventDefault(); setMessage(null); setError(null); const response = await fetch(`/api/merchant/stores/${store.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) setError(data.error ?? "تعذر حفظ إعدادات المتجر"); else setMessage("تم حفظ إعدادات المتجر."); }
  return <form onSubmit={submit} className="surface-card space-y-4 p-5 sm:p-6"><p className="section-kicker">هوية المتجر</p><h2 className="text-xl font-black">المعلومات الظاهرة للعملاء</h2>{([['name','اسم المتجر'],['category','تصنيف المتجر'],['address','العنوان'],['phone','هاتف المتجر'],['description','الوصف']] as const).map(([key,label]) => <label key={key} className="block text-sm font-bold">{label}<input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-2xl border border-[#c8dcd1] px-4 py-3" /></label>)}<button className="btn-primary">حفظ الإعدادات</button>{message && <p role="status" className="text-sm font-bold text-[#27735e]">{message}</p>}{error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}</form>;
}
