export type OnboardingRole = "CUSTOMER" | "MERCHANT" | "COURIER";

export type MerchantApplicationInput = {
  fullName: string;
  phone: string;
  email: string;
  storeName: string;
  storeCategory: string;
  storeAddress: string;
  storePhone: string;
  storeLocation?: Record<string, unknown> | null;
  businessDescription?: string;
};

export type CourierApplicationInput = {
  fullName: string;
  phone: string;
  email: string;
  nationalIdReference: string;
  vehicleType: string;
  vehiclePlate: string;
};

export function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateMerchantApplication(input: Partial<MerchantApplicationInput>) {
  const data = {
    fullName: clean(input.fullName),
    phone: clean(input.phone),
    email: clean(input.email).toLowerCase(),
    storeName: clean(input.storeName),
    storeCategory: clean(input.storeCategory),
    storeAddress: clean(input.storeAddress),
    storePhone: clean(input.storePhone),
    storeLocation: input.storeLocation ?? null,
    businessDescription: clean(input.businessDescription),
  };
  const missing = [
    ["fullName", data.fullName],
    ["phone", data.phone],
    ["email", data.email],
    ["storeName", data.storeName],
    ["storeCategory", data.storeCategory],
    ["storeAddress", data.storeAddress],
    ["storePhone", data.storePhone],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) return { ok: false as const, error: `MISSING_${missing.join("_").toUpperCase()}` };
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return { ok: false as const, error: "INVALID_EMAIL" };
  return { ok: true as const, data };
}

export function validateCourierApplication(input: Partial<CourierApplicationInput>) {
  const data = {
    fullName: clean(input.fullName),
    phone: clean(input.phone),
    email: clean(input.email).toLowerCase(),
    nationalIdReference: clean(input.nationalIdReference),
    vehicleType: clean(input.vehicleType),
    vehiclePlate: clean(input.vehiclePlate),
  };
  const missing = [
    ["fullName", data.fullName],
    ["phone", data.phone],
    ["email", data.email],
    ["nationalIdReference", data.nationalIdReference],
    ["vehicleType", data.vehicleType],
    ["vehiclePlate", data.vehiclePlate],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) return { ok: false as const, error: `MISSING_${missing.join("_").toUpperCase()}` };
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return { ok: false as const, error: "INVALID_EMAIL" };
  return { ok: true as const, data };
}
