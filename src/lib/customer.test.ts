import { describe, expect, it } from "vitest";
import { inventoryLabel } from "./inventory";

describe("customer inventory labels", () => {
  it.each([
    ["AVAILABLE", "متاح"],
    ["UNAVAILABLE", "غير متاح"],
    ["UNKNOWN", "التوفر غير مؤكد"],
  ] as const)("maps %s without overstating availability", (status, text) => {
    expect(inventoryLabel(status).text).toBe(text);
  });
});
