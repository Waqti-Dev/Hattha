export type InventoryStatus = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";

export function inventoryLabel(status: InventoryStatus) {
  switch (status) {
    case "AVAILABLE":
      return { text: "متاح", className: "bg-emerald-50 text-emerald-700" };
    case "UNAVAILABLE":
      return { text: "غير متاح", className: "bg-rose-50 text-rose-700" };
    default:
      return { text: "التوفر غير مؤكد", className: "bg-amber-50 text-amber-700" };
  }
}
