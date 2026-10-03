import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261003150000_initial_schema.sql"),
  "utf8",
);
const hardening = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261003151000_security_hardening.sql"),
  "utf8",
);

describe("HATTAHA Phase 1 schema", () => {
  it("declares every required normalized table", () => {
    const requiredTables = [
      "profiles", "user_roles", "stores", "store_staff", "products",
      "store_products", "inventory", "addresses", "orders", "order_items",
      "order_attempts", "couriers", "deliveries", "payments", "payment_events",
      "notifications", "reviews", "platform_settings",
    ];

    for (const table of requiredTables) {
      expect(migration).toContain(`create table public.${table}`);
    }
  });

  it("defines the four application roles and explicit order/payment states", () => {
    expect(migration).toContain("'CUSTOMER', 'MERCHANT', 'COURIER', 'ADMIN'");
    expect(migration).toContain("'CUSTOMER_CONFIRMED_DELIVERY'");
    expect(migration).toContain("'WAITING_PAYMENT_CONFIRMATION'");
    expect(migration).toContain("'PAYMENT_EXPIRED'");
  });

  it("enables RLS on all required tables and creates the auth profile trigger", () => {
    expect((migration.match(/enable row level security/g) ?? []).length).toBe(18);
    expect(migration).toContain("create trigger on_auth_user_created");
    expect(migration).toContain("insert into public.user_roles (user_id, role)");
  });

  it("removes public RPC execution from security-definer helpers", () => {
    expect(hardening).toContain("revoke execute on function public.has_role");
    expect(hardening).toContain("revoke execute on function public.is_store_staff");
    expect(hardening).toContain("revoke execute on function public.is_order_customer");
  });
});
