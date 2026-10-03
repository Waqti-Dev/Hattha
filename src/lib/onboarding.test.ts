import { describe, expect, it } from "vitest";
import { validateCourierApplication, validateMerchantApplication } from "./onboarding";

describe("onboarding validation", () => {
  it("requires merchant identity and store fields", () => {
    expect(validateMerchantApplication({ fullName: "Owner" }).ok).toBe(false);
    expect(validateMerchantApplication({ fullName: "Owner", phone: "+2010", email: "owner@example.com", storeName: "Market", storeCategory: "Hypermarket", storeAddress: "Cairo", storePhone: "+2011" }).ok).toBe(true);
  });
  it("requires courier verification fields", () => {
    expect(validateCourierApplication({ fullName: "Driver", phone: "+2010", email: "driver@example.com" }).ok).toBe(false);
    expect(validateCourierApplication({ fullName: "Driver", phone: "+2010", email: "driver@example.com", nationalIdReference: "ID-REF", vehicleType: "Motorcycle", vehiclePlate: "ABC" }).ok).toBe(true);
  });
});
