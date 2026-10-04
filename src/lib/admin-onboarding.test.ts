import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const migration = readFileSync(resolve(root, "supabase/migrations/20261003223000_admin_onboarding_workflows.sql"), "utf8");
const isolationMigration = readFileSync(resolve(root, "supabase/migrations/20261004064000_onboarding_role_isolation_notifications.sql"), "utf8");
const bootstrapMigration = readFileSync(resolve(root, "supabase/migrations/20261004080000_reliable_onboarding_bootstrap.sql"), "utf8");
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
    expect(bootstrap).toContain('supabase.rpc("bootstrap_onboarding"');
    expect(bootstrap).toContain('status: String(status ?? "CUSTOMER")');
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
  it("does not assign CUSTOMER to merchant or courier applicants", () => {
    expect(isolationMigration).toContain("coalesce(v_onboarding_role, 'CUSTOMER') not in ('MERCHANT', 'COURIER')");
    expect(isolationMigration).toContain("delete from public.user_roles where user_id = v_app.applicant_id and role = 'CUSTOMER'");
    expect(isolationMigration).toContain("MERCHANT_APPROVED");
    expect(isolationMigration).toContain("COURIER_APPROVED");
  });
  it("uses an authenticated idempotent database bootstrap for merchant applications", () => {
    expect(bootstrapMigration).toContain("create or replace function public.bootstrap_onboarding()");
    expect(bootstrapMigration).toContain("if v_status in ('PENDING', 'APPROVED') then return v_status;");
    expect(bootstrapMigration).toContain("status\n    ) values (");
    expect(bootstrapMigration).toContain("'PENDING'");
    expect(bootstrap).toContain('supabase.rpc("bootstrap_onboarding"');
    expect(bootstrap).not.toContain("from(\"merchant_applications\").insert");
  });
});
