import { InventoryCategory } from "@/types/enums";

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  PACKAGING_MATERIALS: "Packaging Materials",
  GOODS: "Goods",
  SPARE_PARTS: "Spare Parts",
  RETURNED_ITEMS: "Returned Items",
  WAREHOUSE_SUPPLIES: "Warehouse Supplies",
};

export function getInventoryCategoryLabel(category: InventoryCategory | string) {
  return INVENTORY_CATEGORY_LABELS[category as InventoryCategory] ?? category.replace(/_/g, " ");
}

export function getInventoryCategoryOptions() {
  return (Object.keys(InventoryCategory) as InventoryCategory[]).map((value) => ({
    value,
    label: INVENTORY_CATEGORY_LABELS[value],
  }));
}

export function formatInventoryOperation(operation: string) {
  return operation.replace(/_/g, " ");
}
