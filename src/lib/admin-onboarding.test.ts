import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const migration = readFileSync(resolve(root, "supabase/migrations/20261003223000_admin_onboarding_workflows.sql"), "utf8");
const bootstrap = readFileSync(resolve(root, "src/app/api/onboarding/bootstrap/route.ts"), "utf8");
const access = readFileSync(resolve(root, "src/lib/access.ts"), "utf8");

describe("admin and onboarding boundaries", () => {
  it("protects every admin workflow with the database role check", () => {
    expect(migration).toContain("not public.has_role('ADMIN')");
    expect(migration).toContain("reject_merchant_application");
    expect(migration).toContain("approve_courier_application");
    expect(migration).toContain("reject_courier_application");
  });
  it("does not provide a public ADMIN registration path", () => {
    expect(bootstrap).toContain('metadata.onboarding_role === "MERCHANT"');
    expect(bootstrap).toContain('metadata.onboarding_role === "COURIER"');
    expect(bootstrap).toContain(': "CUSTOMER"');
    expect(bootstrap).not.toContain("role: \"ADMIN\"");
  });
  it("routes from persisted state instead of trusting URL or client role data", () => {
    expect(access).toContain('state.role === "ADMIN"');
    expect(access).toContain('state.merchantApplication?.status === "PENDING"');
    expect(access).toContain('state.courier?.verification_status === "VERIFIED"');
  });
  it("contains no password or credential literal", () => {
    expect(migration.toLowerCase()).not.toContain("password");
    expect(migration.toLowerCase()).not.toContain("hattha.owner");
  });
});
