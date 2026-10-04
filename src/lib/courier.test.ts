import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261004133000_fix_courier_jobs_ambiguous_id.sql"), "utf8");

describe("courier jobs security contract", () => {
  it("qualifies courier profile columns despite RETURNS TABLE output names", () => {
    expect(migration).toContain("from public.couriers c where c.id = auth.uid()");
    expect(migration).toContain("c.verification_status = 'VERIFIED'");
    expect(migration).not.toContain("from public.couriers where id = auth.uid()");
  });
});
