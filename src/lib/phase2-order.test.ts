import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const creation = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003160000_customer_order_creation.sql"), "utf8");
const cancellation = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003161000_customer_order_cancellation.sql"), "utf8");
const rowAssignmentFix = readFileSync(resolve(process.cwd(), "supabase/migrations/20261004131500_fix_customer_order_row_assignments.sql"), "utf8");

describe("HATTAHA Phase 2 order boundaries", () => {
  it("creates orders through a security-definer server function", () => {
    expect(creation).toContain("create or replace function public.create_customer_order");
    expect(creation).toContain("security definer");
    expect(creation).toContain("auth.uid()");
  });
  it("recalculates authoritative prices and rejects unavailable inventory", () => {
    expect(creation).toContain("v_store_product.price");
    expect(creation).toContain("v_inventory.status <> 'AVAILABLE'");
    expect(creation).toContain("v_subtotal := v_subtotal + v_line_total");
  });
  it("does not expose order creation to anonymous clients", () => {
    expect(creation).toContain("revoke execute on function public.create_customer_order");
    expect(creation).toContain("grant execute on function public.create_customer_order");
  });
  it("assigns selected composite rows into rowtype variables by columns", () => {
    expect(rowAssignmentFix).toContain("select sp.* into v_store_product");
    expect(rowAssignmentFix).toContain("select p.* into v_product");
    expect(rowAssignmentFix).not.toContain("select sp into v_store_product");
    expect(rowAssignmentFix).not.toContain("select p into v_product");
  });
  it("limits cancellation to pre-acceptance states", () => {
    expect(cancellation).toContain("cancel_customer_order");
    expect(cancellation).toContain("ORDER_CANNOT_BE_CANCELLED");
    expect(cancellation).toContain("'WAITING_PAYMENT_CONFIRMATION'");
    expect(cancellation).not.toContain("'ACCEPTED'");
  });
});
