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

export type PackageInputMode = "weight" | "dimensions";

export function inferPackageInputMode(shipment?: {
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}): PackageInputMode {
  if (shipment?.lengthCm && shipment?.widthCm && shipment?.heightCm) {
    return "dimensions";
  }
  return "weight";
}

export function buildShipmentPackagePayload(
  values: {
    weight?: number;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    packageCount?: number;
  },
  mode: PackageInputMode
) {
  if (mode === "dimensions") {
    return {
      weight: calculateVolumetricWeightKg({
        lengthCm: Number(values.lengthCm),
        widthCm: Number(values.widthCm),
        heightCm: Number(values.heightCm),
        packageCount: values.packageCount ?? 1,
      }),
      lengthCm: Number(values.lengthCm),
      widthCm: Number(values.widthCm),
      heightCm: Number(values.heightCm),
      packageCount: values.packageCount ?? 1,
    };
  }

  return {
    weight: Number(values.weight),
    lengthCm: undefined,
    widthCm: undefined,
    heightCm: undefined,
    packageCount: values.packageCount ?? 1,
  };
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

export type ShipmentPackageEntry = {
  id: string;
  inputMode: PackageInputMode;
  weight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount: number;
};

export function createShipmentPackageEntry(
  inputMode: PackageInputMode = "weight"
): ShipmentPackageEntry {
  return {
    id: crypto.randomUUID(),
    inputMode,
    packageCount: 1,
  };
}

export function resolvePackageEntryWeight(entry: ShipmentPackageEntry): number {
  if (entry.inputMode === "dimensions") {
    return calculateVolumetricWeightKg({
      lengthCm: Number(entry.lengthCm),
      widthCm: Number(entry.widthCm),
      heightCm: Number(entry.heightCm),
      packageCount: entry.packageCount ?? 1,
    });
  }

  return Number(entry.weight) || 0;
}

export function resolvePackageEntryCbm(entry: ShipmentPackageEntry): number | null {
  if (entry.inputMode !== "dimensions") return null;
  if (!entry.lengthCm || !entry.widthCm || !entry.heightCm) return null;
  if (entry.lengthCm <= 0 || entry.widthCm <= 0 || entry.heightCm <= 0) return null;

  return calculateCbm({
    lengthCm: entry.lengthCm,
    widthCm: entry.widthCm,
    heightCm: entry.heightCm,
    packageCount: entry.packageCount ?? 1,
  });
}

export function validateShipmentPackageEntry(entry: ShipmentPackageEntry): string | null {
  const count = entry.packageCount;
  if (!count || count < 1 || !Number.isInteger(count)) {
    return "Package count must be at least 1";
  }

  if (entry.inputMode === "weight") {
    if (!entry.weight || entry.weight <= 0) {
      return "Weight must be greater than 0";
    }
    return null;
  }

  if (!entry.lengthCm || !entry.widthCm || !entry.heightCm) {
    return "Enter length, width, and height";
  }

  if (entry.lengthCm <= 0 || entry.widthCm <= 0 || entry.heightCm <= 0) {
    return "Dimensions must be greater than 0";
  }

  return null;
}

export function validateShipmentPackages(entries: ShipmentPackageEntry[]) {
  const errors: Record<string, string> = {};

  if (entries.length === 0) {
    return { errors, message: "Add at least one package" };
  }

  for (const entry of entries) {
    const message = validateShipmentPackageEntry(entry);
    if (message) {
      errors[entry.id] = message;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Please complete all package details" };
  }

  return { errors, message: null };
}

export function aggregateShipmentPackages(entries: ShipmentPackageEntry[]) {
  let totalWeight = 0;
  let totalPackageCount = 0;
  let totalCbm = 0;
  let hasCbm = false;

  for (const entry of entries) {
    totalWeight += resolvePackageEntryWeight(entry);
    totalPackageCount += entry.packageCount ?? 1;
    const cbm = resolvePackageEntryCbm(entry);
    if (cbm != null) {
      totalCbm += cbm;
      hasCbm = true;
    }
  }

  const singleEntry = entries.length === 1 ? entries[0] : null;
  const useSingleDimensions =
    singleEntry?.inputMode === "dimensions" &&
    singleEntry.lengthCm != null &&
    singleEntry.widthCm != null &&
    singleEntry.heightCm != null;

  return {
    weight: Math.round(totalWeight * 100) / 100,
    packageCount: totalPackageCount,
    cbm: hasCbm ? Math.round(totalCbm * 10000) / 10000 : null,
    lengthCm: useSingleDimensions ? singleEntry.lengthCm : undefined,
    widthCm: useSingleDimensions ? singleEntry.widthCm : undefined,
    heightCm: useSingleDimensions ? singleEntry.heightCm : undefined,
  };
}

export function formatShipmentPackagesNote(entries: ShipmentPackageEntry[]): string {
  if (entries.length <= 1) return "";

  return entries
    .map((entry, index) => {
      const count = entry.packageCount ?? 1;
      if (entry.inputMode === "weight") {
        return `Package ${index + 1}: ${entry.weight} kg (${count} item${count === 1 ? "" : "s"})`;
      }

      return `Package ${index + 1}: ${entry.lengthCm}×${entry.widthCm}×${entry.heightCm} cm (${count} item${count === 1 ? "" : "s"}, ${resolvePackageEntryWeight(entry)} kg)`;
    })
    .join("\n");
}
