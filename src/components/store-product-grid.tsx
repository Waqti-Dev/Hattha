"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { inventoryLabel } from "@/lib/inventory";
import type { StoreProduct } from "@/lib/customer";

export function StoreProductGrid({ storeId, products }: { storeId: string; products: StoreProduct[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => Array.from(new Set(products.map((item) => item.product?.category).filter((value): value is string => Boolean(value)))), [products]);
  const filtered = products.filter((item) => {
    const matchesSearch = !search.trim() || `${item.product?.name ?? ""} ${item.product?.description ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesCategory = category === "all" || item.product?.category === category;
    return matchesSearch && matchesCategory;
  });
  return <div><div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="sr-only" htmlFor="product-search">البحث في منتجات المتجر</label><input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث داخل المنتجات…" className="rounded-2xl border border-[#dce8e1] bg-white px-4 py-3 outline-none focus:border-[#568171]" />{categories.length > 0 && <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-[#dce8e1] bg-white px-4 py-3 font-bold"><option value="all">كل التصنيفات</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>}</div>{filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-[#c8dcd1] bg-white p-8 text-center text-[#6a8278]">لا توجد منتجات مطابقة للبحث.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => { const available = item.is_active && item.inventory?.status === "AVAILABLE"; const availability = inventoryLabel(item.inventory?.status ?? "UNKNOWN"); const card = <article className={`relative rounded-3xl border border-[#e1ebe5] bg-white p-5 shadow-sm ${available ? "transition hover:-translate-y-1 hover:shadow-lg" : "opacity-65"}`}><div className="absolute left-4 top-4 z-10"><FavoriteButton storeProductId={item.id} /></div><div className="flex h-36 items-center justify-center rounded-2xl bg-[#f2f6f2] text-5xl">{item.product?.name.trim().charAt(0) || "؟"}</div><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{item.product?.name || "منتج"}</h3>{item.product?.category && <p className="mt-1 text-xs font-bold text-[#779187]">{item.product.category}</p>}</div><span className="whitespace-nowrap text-lg font-black text-[#27735e]">{item.effective_price < Number(item.price) && <del className="ml-1 text-sm text-[#8aa097]">{Number(item.price).toFixed(2)}</del>}{Number(item.effective_price).toFixed(2)} ج.م</span></div>{item.offers.length > 0 && <p className="mt-2 text-xs font-black text-amber-700">{item.offers[0].name}</p>}<p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a8278]">{item.product?.description || "تفاصيل المنتج غير متاحة"}</p><span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${availability.className}`}>{available ? availability.text : "غير متاح للطلب"}</span></article>; return available ? <Link key={item.id} href={`/stores/${storeId}/products/${item.id}`}>{card}</Link> : <div key={item.id}>{card}</div>; })}</div>}</div>;
}
