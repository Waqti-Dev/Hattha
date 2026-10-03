export type AddressInput = {
  label?: string;
  addressLine: string;
  area: string;
  city: string;
  location?: Record<string, unknown> | null;
  isDefault?: boolean;
};

export function validateAddressInput(value: unknown): { ok: true; data: AddressInput } | { ok: false; message: string } {
  if (!value || typeof value !== "object") return { ok: false, message: "بيانات العنوان غير صالحة." };
  const input = value as Partial<AddressInput>;
  const addressLine = typeof input.addressLine === "string" ? input.addressLine.trim() : "";
  const area = typeof input.area === "string" ? input.area.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (addressLine.length < 3 || addressLine.length > 200) return { ok: false, message: "اكتب عنواناً واضحاً من 3 إلى 200 حرف." };
  if (area.length < 2 || area.length > 100) return { ok: false, message: "اكتب المنطقة بشكل صحيح." };
  if (city.length < 2 || city.length > 100) return { ok: false, message: "اكتب المدينة بشكل صحيح." };
  const label = typeof input.label === "string" ? input.label.trim().slice(0, 50) : "";
  const location = input.location && typeof input.location === "object" && !Array.isArray(input.location) ? input.location : null;
  return { ok: true, data: { label, addressLine, area, city, location, isDefault: input.isDefault === true } };
}
