"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { CartItem } from "@/lib/cart";

export function AddToCart({ item }: { item: CartItem }) {
  const { cart, addItem, replaceAndAddItem, hydrated } = useCart();
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function add() {
    const result = addItem(item);
    if (result === "conflict") setConflict(true);
    if (result === "unavailable") setMessage("هذا المنتج غير متاح حالياً ولا يمكن إضافته للسلة.");
    if (result === "added") setMessage("تمت إضافة المنتج إلى السلة.");
  }

  function confirmSwitch() {
    replaceAndAddItem(item);
    setConflict(false);
    setMessage("تم تفريغ السلة وإضافة المنتج الجديد.");
  }

  const unavailable = item.inventoryStatus !== "AVAILABLE";
  return (
    <div className="mt-8">
      <button type="button" onClick={add} disabled={!hydrated || unavailable} className="w-full rounded-2xl bg-[#173b35] px-5 py-4 font-black text-white transition hover:bg-[#24584e] disabled:cursor-not-allowed disabled:bg-slate-300">
        {unavailable ? "غير متاح للإضافة" : "أضف إلى السلة"}
      </button>
      {message && <p role="status" className="mt-3 text-center text-sm font-bold text-[#27735e]">{message}</p>}
      {conflict && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-[#173b35]/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black">السلة مرتبطة بمتجر آخر</h2>
            <p className="mt-3 leading-7 text-[#6a8278]">تحتوي سلتك على منتجات من متجر {cart.storeName || "آخر"}. هل تريد تفريغ السلة والبدء بهذا المتجر؟</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConflict(false)} className="flex-1 rounded-2xl border border-[#dce8e1] px-4 py-3 font-black">إلغاء</button>
              <button type="button" onClick={confirmSwitch} className="flex-1 rounded-2xl bg-[#173b35] px-4 py-3 font-black text-white">تفريغ وإضافة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
