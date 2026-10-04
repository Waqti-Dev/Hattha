import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003190000_marketplace_hardening.sql"), "utf8");
const privilegeMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261004120000_security_privileges_and_indexes.sql"), "utf8");
const noOfferPricingMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261004131700_fix_no_offer_line_total.sql"), "utf8");
const orderApi = readFileSync(resolve(process.cwd(), "src/app/api/orders/[orderId]/route.ts"), "utf8");
const merchantProductsApi = readFileSync(resolve(process.cwd(), "src/app/api/merchant/products/route.ts"), "utf8");

describe("marketplace hardening", () => {
  it("removes direct customer order and item inserts", () => {
    expect(migration).toContain("drop policy if exists orders_customer_insert on public.orders");
    expect(migration).toContain("drop policy if exists order_items_customer_insert on public.order_items");
    expect(migration).toContain("create or replace function public.create_customer_order");
  });

  it("keeps quantity limits and finite inventory inside the authoritative RPC", () => {
    expect(migration).toContain("calculate_effective_store_product_line_total");
    expect(migration).toContain("INSUFFICIENT_INVENTORY");
    expect(migration).toContain("quantity = quantity - v_quantity");
  });

  it("preserves catalog pricing when no active offer exists", () => {
    expect(noOfferPricingMigration).toContain("case when o.id is null then null else");
    expect(noOfferPricingMigration).toContain("coalesce(min(");
    expect(noOfferPricingMigration).toContain("v_price * p_quantity");
  });

  it("rejects unknown order mutations and guards merchant reads", () => {
    expect(orderApi).toContain("UNKNOWN_ORDER_ACTION");
    expect(merchantProductsApi).toContain("MERCHANT_STORE_ACCESS_DENIED");
    expect(merchantProductsApi).toContain("eq(\"user_id\", auth.user.id)");
  });

  it("does not expose trigger-only or internal pricing helpers as client RPCs", () => {
    expect(privilegeMigration).toContain("revoke execute on function public.notify_new_order()");
    expect(privilegeMigration).toContain("revoke execute on function public.ensure_delivery_for_ready_order()");
    expect(privilegeMigration).toContain("revoke execute on function public.calculate_effective_store_product_line_total(uuid, integer)");
    expect(privilegeMigration).toContain("customer_favorites_store_idx");
    expect(privilegeMigration).toContain("customer_favorites_store_product_idx");
  });
});
