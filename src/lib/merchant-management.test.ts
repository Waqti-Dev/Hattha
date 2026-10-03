import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003182000_onboarding_merchant_management.sql"), "utf8");
const pricingMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003183000_authoritative_offer_pricing.sql"), "utf8");

describe("merchant pilot security contracts", () => {
  it("does not auto-grant merchant access during application", () => {
    expect(migration).toContain("status text not null default 'PENDING'");
    expect(migration).toContain("approve_merchant_application");
    expect(migration).toContain("insert into public.user_roles(user_id, role) values (v_app.applicant_id, 'MERCHANT')");
  });
  it("validates discounts and uses effective prices in order creation", () => {
    expect(migration).toContain("discount_value <= 100");
    expect(migration).toContain("calculate_effective_store_product_price");
    expect(pricingMigration).toContain("v_unit_price := public.calculate_effective_store_product_price");
    expect(pricingMigration).toContain("order_items");
  });
});
