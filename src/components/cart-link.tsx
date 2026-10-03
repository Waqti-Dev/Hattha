"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
  const { count, hydrated } = useCart();
  return (
    <Link href="/cart" className="relative rounded-xl px-3 py-2 hover:bg-white" aria-label={`السلة، ${count} منتجات`}>
      السلة
      {hydrated && count > 0 && <span className="mr-1 inline-grid min-w-5 place-items-center rounded-full bg-[#f2c879] px-1.5 py-0.5 text-[11px] font-black text-[#173b35]">{count}</span>}
    </Link>
  );
}
