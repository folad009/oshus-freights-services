import { ShipmentType, type ShipmentType as ShipmentTypeValue } from "@/types/enums";
import { calculateCbm } from "./helpers";

export const CONTAINER_CAPACITIES = {
  CONTAINER_20FT: { label: "20ft Standard", cbm: 33 },
  CONTAINER_40FT: { label: "40ft Standard", cbm: 67 },
  CONTAINER_40FT_HC: { label: "40ft High Cube", cbm: 76 },
} as const;

export type ContainerType = keyof typeof CONTAINER_CAPACITIES;

const CONTAINER_SHIPMENT_TYPES: ShipmentTypeValue[] = [
  ShipmentType.STANDARD_SEA_FREIGHT,
  ShipmentType.EXPRESS,
];

export function usesContainerCapacity(shipmentType: ShipmentTypeValue) {
  return CONTAINER_SHIPMENT_TYPES.includes(shipmentType);
}

export function defaultContainerType(shipmentType: ShipmentTypeValue): ContainerType {
  if (shipmentType === ShipmentType.EXPRESS) return "CONTAINER_20FT";
  return "CONTAINER_40FT";
}

export function calculateVolumetricWeightKg(params: {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount?: number;
}) {
  const count = params.packageCount ?? 1;
  const weight = (params.lengthCm * params.widthCm * params.heightCm * count) / 5000;
  return Math.round(weight * 100) / 100;
}

export function analyzePackageMetrics(params: {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  containerCbm: number;
}) {
  const singlePackageCbm = calculateCbm({
    lengthCm: params.lengthCm,
    widthCm: params.widthCm,
    heightCm: params.heightCm,
    packageCount: 1,
  });
  const totalCbm = calculateCbm(params);
  const volumetricWeightKg = calculateVolumetricWeightKg(params);
  const maxPackages =
    singlePackageCbm > 0 ? Math.floor(params.containerCbm / singlePackageCbm) : 0;
  const fillPercent =
    params.containerCbm > 0
      ? Math.round((totalCbm / params.containerCbm) * 1000) / 10
      : 0;
  const isFull = totalCbm >= params.containerCbm || params.packageCount >= maxPackages;
  const packagesToFill = isFull ? 0 : Math.max(0, maxPackages - params.packageCount);
  const overflowPackages =
    maxPackages > 0 && params.packageCount > maxPackages
      ? params.packageCount - maxPackages
      : 0;

  return {
    singlePackageCbm,
    totalCbm,
    volumetricWeightKg,
    maxPackages,
    fillPercent: Math.min(fillPercent, 999),
    isFull,
    packagesToFill,
    overflowPackages,
    containerCbm: params.containerCbm,
  };
}

export function formatContainerStatus(metrics: ReturnType<typeof analyzePackageMetrics>) {
  if (metrics.overflowPackages > 0) {
    return `Container over capacity by ${metrics.overflowPackages} package${
      metrics.overflowPackages === 1 ? "" : "s"
    } (${metrics.fillPercent}% · ${metrics.totalCbm.toFixed(3)} / ${metrics.containerCbm} m³)`;
  }

  if (metrics.isFull) {
    return `Container full (${metrics.fillPercent}% · ${metrics.totalCbm.toFixed(3)} / ${metrics.containerCbm} m³)`;
  }

  if (metrics.packagesToFill === 0) {
    return `Container ${metrics.fillPercent}% full`;
  }

  return `Container ${metrics.fillPercent}% full · ${metrics.packagesToFill} more package${
    metrics.packagesToFill === 1 ? "" : "s"
  } to fill`;
}
