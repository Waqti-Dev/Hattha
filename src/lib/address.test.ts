import { describe, expect, it } from "vitest";
import { validateAddressInput } from "./address";

describe("customer address validation", () => {
  it("accepts a valid address without inventing coordinates", () => {
    const result = validateAddressInput({ addressLine: "شارع البحر ١٢", area: "وسط البلد", city: "بلطيم" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.location).toBeNull();
  });
  it("rejects missing required fields", () => expect(validateAddressInput({ addressLine: "", area: "", city: "" }).ok).toBe(false));
  it("rejects invalid location arrays", () => {
    const result = validateAddressInput({ addressLine: "شارع البحر ١٢", area: "وسط البلد", city: "بلطيم", location: [] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.location).toBeNull();
  });
});
