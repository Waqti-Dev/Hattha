"use client";

import { useEffect, useState } from "react";

export function FavoriteButton({ storeId, storeProductId }: { storeId?: string; storeProductId?: string }) {
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = storeId ? `storeId=${encodeURIComponent(storeId)}` : `storeProductId=${encodeURIComponent(storeProductId ?? "")}`;
  useEffect(() => { let cancelled = false; void fetch(`/api/favorites?${query}`).then(async (response) => { if (!response.ok) return; const body = await response.json(); if (!cancelled) setFavorite(Array.isArray(body.favorites) && body.favorites.length > 0); }); return () => { cancelled = true; }; }, [query]);
  async function toggle(event: React.MouseEvent) {
    event.preventDefault(); event.stopPropagation(); setBusy(true);
    const response = await fetch(`/api/favorites?${query}`, { method: favorite ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: favorite ? undefined : JSON.stringify({ storeId, storeProductId }) });
    if (response.ok) setFavorite(!favorite);
    setBusy(false);
  }
  return <button type="button" onClick={toggle} disabled={busy} aria-label={favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorite} className={`grid h-10 w-10 place-items-center rounded-full border text-lg transition ${favorite ? "border-[#f2c879] bg-[#fff5dc] text-[#a66d00]" : "border-[#dce8e1] bg-white/90 text-[#779187]"} disabled:opacity-50`}>{favorite ? "★" : "☆"}</button>;
}
