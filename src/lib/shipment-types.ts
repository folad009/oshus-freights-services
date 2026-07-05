import { ShipmentType, type ShipmentType as ShipmentTypeValue } from "@/types/enums";

export const SHIPMENT_TYPE_LABELS: Record<ShipmentTypeValue, string> = {
  DOMESTIC: "Domestic",
  INTERNATIONAL: "International",
  STANDARD_AIR_FREIGHT: "Standard Air Freight",
  STANDARD_SEA_FREIGHT: "Standard Sea Freight",
  BULK_CARGO: "Bulk Cargo",
};

/** Shipment types available to customers (Express removed). */
export const CUSTOMER_SHIPMENT_TYPES: ShipmentTypeValue[] = [
  ShipmentType.STANDARD_AIR_FREIGHT,
  ShipmentType.STANDARD_SEA_FREIGHT,
  ShipmentType.DOMESTIC,
  ShipmentType.INTERNATIONAL,
  ShipmentType.BULK_CARGO,
];

export const STAFF_SHIPMENT_TYPES: ShipmentTypeValue[] = Object.values(ShipmentType);

export function getShipmentTypeLabel(type: ShipmentTypeValue) {
  return SHIPMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function getShipmentTypeOptions(forCustomer: boolean) {
  const types = forCustomer ? CUSTOMER_SHIPMENT_TYPES : STAFF_SHIPMENT_TYPES;
  return types.map((value) => ({
    value,
    label: getShipmentTypeLabel(value),
  }));
}
