import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261003162000_merchant_pilot_transitions.sql"), "utf8");

describe("HATTAHA Merchant Pilot transitions", () => {
  it("requires an authenticated merchant and store staff relationship", () => {
    expect(migration).toContain("has_role('MERCHANT')");
    expect(migration).toContain("is_store_staff(v_order.store_id)");
    expect(migration).toContain("MERCHANT_STORE_ACCESS_DENIED");
  });
  it("implements only the intended pilot transitions", () => {
    expect(migration).toContain("v_order.status not in ('FINDING_STORE', 'STORE_CONFIRMING')");
    expect(migration).toContain("v_order.status <> 'ACCEPTED'");
    expect(migration).toContain("v_order.status <> 'PREPARING'");
    expect(migration).toContain("v_status := 'READY_FOR_PICKUP'");
  });
  it("records rejection attempts and customer notifications", () => {
    expect(migration).toContain("'DECLINED'::public.order_attempt_status");
    expect(migration).toContain("insert into public.notifications");
  });
  it("does not expose the transition RPC to anonymous users", () => {
    expect(migration).toContain("revoke execute on function public.merchant_update_order_status");
    expect(migration).toContain("grant execute on function public.merchant_update_order_status");
  });
});
