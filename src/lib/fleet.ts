import { VehicleType, VehicleStatus } from "@/types/enums";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: "Motorcycle",
  VAN: "Van",
  TRUCK: "Truck",
  CONTAINER_TRUCK: "Container Truck",
  CARGO_VEHICLE: "Cargo Vehicle",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  IN_USE: "In Use",
  MAINTENANCE: "Maintenance",
  OUT_OF_SERVICE: "Out of Service",
};

export function getVehicleTypeLabel(type: VehicleType | string) {
  return VEHICLE_TYPE_LABELS[type as VehicleType] ?? type.replace(/_/g, " ");
}

export function getVehicleStatusLabel(status: VehicleStatus | string) {
  return VEHICLE_STATUS_LABELS[status as VehicleStatus] ?? status.replace(/_/g, " ");
}

export function getVehicleTypeOptions() {
  return (Object.keys(VehicleType) as VehicleType[]).map((value) => ({
    value,
    label: VEHICLE_TYPE_LABELS[value],
  }));
}

export function getVehicleStatusOptions() {
  return (Object.keys(VehicleStatus) as VehicleStatus[]).map((value) => ({
    value,
    label: VEHICLE_STATUS_LABELS[value],
  }));
}
