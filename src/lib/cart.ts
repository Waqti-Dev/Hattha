export type CartItem = {
  storeId: string;
  storeName: string;
  storeProductId: string;
  productId: string;
  productName: string;
  description: string | null;
  imagePath: string | null;
  quantity: number;
  unitPrice: number;
  inventoryStatus: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
};

export type CartState = {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
};

export type AddCartResult =
  | { kind: "added"; cart: CartState }
  | { kind: "conflict"; existingStoreId: string; existingStoreName: string }
  | { kind: "unavailable" };

export const emptyCart = (): CartState => ({ storeId: null, storeName: null, items: [] });

export function sanitizeCart(value: unknown): CartState {
  if (!value || typeof value !== "object") return emptyCart();
  const candidate = value as Partial<CartState>;
  if (!Array.isArray(candidate.items)) return emptyCart();

  const items = candidate.items.filter(isValidCartItem).map((item) => ({
    ...item,
    quantity: Math.max(1, Math.floor(item.quantity)),
    unitPrice: roundMoney(item.unitPrice),
  }));
  if (items.length === 0) return emptyCart();

  const storeId = items[0].storeId;
  const sameStore = items.every((item) => item.storeId === storeId);
  if (!sameStore) return emptyCart();

  return { storeId, storeName: items[0].storeName, items };
}

export function addToCart(cart: CartState, item: CartItem): AddCartResult {
  if (item.inventoryStatus !== "AVAILABLE") return { kind: "unavailable" };
  const safeItem = { ...item, quantity: 1, unitPrice: roundMoney(item.unitPrice) };
  if (cart.storeId && cart.storeId !== safeItem.storeId) {
    return {
      kind: "conflict",
      existingStoreId: cart.storeId,
      existingStoreName: cart.storeName ?? "المتجر الحالي",
    };
  }

  const existing = cart.items.find((entry) => entry.storeProductId === safeItem.storeProductId);
  const items = existing
    ? cart.items.map((entry) =>
        entry.storeProductId === safeItem.storeProductId
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry,
      )
    : [...cart.items, safeItem];
  return { kind: "added", cart: { storeId: safeItem.storeId, storeName: safeItem.storeName, items } };
}

export function replaceWithItem(item: CartItem): CartState {
  return { storeId: item.storeId, storeName: item.storeName, items: [{ ...item, quantity: 1, unitPrice: roundMoney(item.unitPrice) }] };
}

export function changeQuantity(cart: CartState, storeProductId: string, delta: number): CartState {
  if (!Number.isFinite(delta) || !Number.isInteger(delta)) return cart;
  const items = cart.items
    .map((item) => item.storeProductId === storeProductId ? { ...item, quantity: item.quantity + delta } : item)
    .filter((item) => item.quantity >= 1);
  return items.length ? { ...cart, items } : emptyCart();
}

export function removeFromCart(cart: CartState, storeProductId: string): CartState {
  const items = cart.items.filter((item) => item.storeProductId !== storeProductId);
  return items.length ? { ...cart, items } : emptyCart();
}

export function cartUnitCount(cart: CartState): number {
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}

export function cartSubtotal(cart: CartState): number {
  return roundMoney(cart.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0));
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return [item.storeId, item.storeName, item.storeProductId, item.productId, item.productName].every(
    (field) => typeof field === "string" && field.length > 0,
  ) && typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
    && typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) && item.unitPrice >= 0
    && ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"].includes(item.inventoryStatus ?? "");
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
