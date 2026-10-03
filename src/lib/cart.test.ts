import { describe, expect, it } from "vitest";
import { addToCart, cartSubtotal, cartUnitCount, changeQuantity, emptyCart, removeFromCart, replaceWithItem, sanitizeCart, type CartItem } from "./cart";

const item = (overrides: Partial<CartItem> = {}): CartItem => ({ storeId: "store-a", storeName: "متجر أ", storeProductId: "listing-a", productId: "product-a", productName: "منتج أ", description: null, imagePath: null, quantity: 1, unitPrice: 10, inventoryStatus: "AVAILABLE", ...overrides });

describe("single-store cart", () => {
  it("adds an item to an empty cart", () => expect(addToCart(emptyCart(), item()).kind).toBe("added"));
  it("increments the same item", () => { const first = addToCart(emptyCart(), item()); expect(first.kind).toBe("added"); if (first.kind === "added") { const second = addToCart(first.cart, item()); expect(second.kind).toBe("added"); if (second.kind === "added") expect(second.cart.items[0].quantity).toBe(2); } });
  it("adds a different item from the same store", () => { const result = addToCart({ ...emptyCart(), storeId: "store-a", storeName: "متجر أ", items: [item()] }, item({ storeProductId: "listing-b", productId: "product-b", productName: "منتج ب", unitPrice: 5 })); expect(result.kind).toBe("added"); if (result.kind === "added") expect(result.cart.items).toHaveLength(2); });
  it("rejects a different store without replacing the cart", () => { const result = addToCart({ storeId: "store-a", storeName: "متجر أ", items: [item()] }, item({ storeId: "store-b", storeName: "متجر ب" })); expect(result).toMatchObject({ kind: "conflict", existingStoreId: "store-a" }); });
  it("replaces only after the caller confirms", () => expect(replaceWithItem(item({ storeId: "store-b", storeName: "متجر ب" })).storeId).toBe("store-b"));
  it("increases quantity", () => expect(changeQuantity({ storeId: "store-a", storeName: "متجر أ", items: [item()] }, "listing-a", 1).items[0].quantity).toBe(2));
  it("decreases quantity but never below one through normal decrease", () => expect(changeQuantity({ storeId: "store-a", storeName: "متجر أ", items: [item({ quantity: 2 })] }, "listing-a", -1).items[0].quantity).toBe(1));
  it("removes an item when quantity would reach zero", () => expect(changeQuantity({ storeId: "store-a", storeName: "متجر أ", items: [item()] }, "listing-a", -1).items).toHaveLength(0));
  it("removes a selected item", () => expect(removeFromCart({ storeId: "store-a", storeName: "متجر أ", items: [item(), item({ storeProductId: "listing-b" })] }, "listing-a").items[0].storeProductId).toBe("listing-b"));
  it("rejects unavailable products", () => expect(addToCart(emptyCart(), item({ inventoryStatus: "UNAVAILABLE" })).kind).toBe("unavailable"));
  it("calculates subtotal and unit count", () => { const cart = { storeId: "store-a", storeName: "متجر أ", items: [item({ quantity: 2 }), item({ storeProductId: "listing-b", unitPrice: 2.5, quantity: 3 })] }; expect(cartSubtotal(cart)).toBe(27.5); expect(cartUnitCount(cart)).toBe(5); });
  it("rejects invalid quantity deltas", () => expect(changeQuantity({ storeId: "store-a", storeName: "متجر أ", items: [item()] }, "listing-a", -0.5).items[0].quantity).toBe(1));
  it("turns corrupted persisted data into an empty cart", () => expect(sanitizeCart({ items: [{ broken: true }] })).toEqual(emptyCart()));
  it("drops mixed-store persisted data safely", () => expect(sanitizeCart({ items: [item(), item({ storeId: "store-b" })] })).toEqual(emptyCart()));
});
