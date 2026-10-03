"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addToCart,
  cartSubtotal,
  cartUnitCount,
  changeQuantity,
  emptyCart,
  removeFromCart,
  replaceWithItem,
  sanitizeCart,
  type CartItem,
  type CartState,
} from "@/lib/cart";

const STORAGE_KEY = "hattaha-cart-v1";

type CartContextValue = {
  cart: CartState;
  hydrated: boolean;
  count: number;
  subtotal: number;
  addItem: (item: CartItem) => "added" | "conflict" | "unavailable";
  replaceAndAddItem: (item: CartItem) => void;
  increase: (storeProductId: string) => void;
  decrease: (storeProductId: string) => void;
  remove: (storeProductId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) setCart(sanitizeCart(JSON.parse(raw)));
      } catch {
        setCart(emptyCart());
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart.items.length === 0) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // A full or restricted storage should not break cart interactions.
    }
  }, [cart, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    hydrated,
    count: cartUnitCount(cart),
    subtotal: cartSubtotal(cart),
    addItem(item) {
      const result = addToCart(cart, item);
      if (result.kind === "added") setCart(result.cart);
      return result.kind;
    },
    replaceAndAddItem(item) { setCart(replaceWithItem(item)); },
    increase(storeProductId) { setCart((current) => changeQuantity(current, storeProductId, 1)); },
    decrease(storeProductId) { setCart((current) => changeQuantity(current, storeProductId, -1)); },
    remove(storeProductId) { setCart((current) => removeFromCart(current, storeProductId)); },
    clear() { setCart(emptyCart()); },
  }), [cart, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
