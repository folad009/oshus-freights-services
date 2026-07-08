"use client";

import { useEffect, useMemo, useState } from "react";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCbm } from "@/lib/helpers";
import { ShipmentType } from "@/types/enums";
import {
  CONTAINER_CAPACITIES,
  type ContainerType,
  analyzePackageMetrics,
  defaultContainerType,
  formatContainerStatus,
  usesContainerCapacity,
} from "@/lib/shipment-metrics";
import { cn } from "@/lib/utils";

export const formSelectClass =
  "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type DimensionErrors = {
  lengthCm?: { message?: string };
  widthCm?: { message?: string };
  heightCm?: { message?: string };
  packageCount?: { message?: string };
};

type PackageMetricsPanelProps<T extends FieldValues> = {
  register: UseFormRegister<T>;
  errors: DimensionErrors;
  shipmentType?: ShipmentType;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  onWeightChange?: (weight: number) => void;
  idPrefix?: string;
  showContainerDetails?: boolean;
};

export function PackageMetricsPanel<T extends FieldValues>({
  register,
  errors,
  shipmentType,
  lengthCm,
  widthCm,
  heightCm,
  packageCount,
  onWeightChange,
  idPrefix = "",
  showContainerDetails = true,
}: PackageMetricsPanelProps<T>) {
  const showContainer = showContainerDetails && shipmentType ? usesContainerCapacity(shipmentType) : false;
  const [containerType, setContainerType] = useState<ContainerType>("CONTAINER_40FT");

  useEffect(() => {
    if (shipmentType) {
      setContainerType(defaultContainerType(shipmentType));
    }
  }, [shipmentType]);

  const metrics = useMemo(() => {
    if (
      !lengthCm ||
      !widthCm ||
      !heightCm ||
      lengthCm <= 0 ||
      widthCm <= 0 ||
      heightCm <= 0
    ) {
      return null;
    }

    const count = packageCount && packageCount > 0 ? packageCount : 1;
    const containerCbm = CONTAINER_CAPACITIES[containerType].cbm;

    return analyzePackageMetrics({
      lengthCm,
      widthCm,
      heightCm,
      packageCount: count,
      containerCbm,
    });
  }, [lengthCm, widthCm, heightCm, packageCount, containerType]);

  useEffect(() => {
    if (metrics && onWeightChange) {
      onWeightChange(metrics.volumetricWeightKg);
    }
  }, [metrics, onWeightChange]);

  const containerStatusClass = metrics
    ? metrics.overflowPackages > 0
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : metrics.isFull
        ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700"
        : "border-amber-500/40 bg-amber-500/5 text-amber-800"
    : "border-dashed border-input bg-muted/40 text-muted-foreground";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-base font-medium">Package Dimensions</p>
        <p className="text-sm text-muted-foreground">
          Enter size in centimeters (cm). Weight is calculated from volume.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}lengthCm`}>Length (cm)</Label>
          <Input
            id={`${idPrefix}lengthCm`}
            type="number"
            step="0.1"
            min="0"
            {...register("lengthCm" as Path<T>, { valueAsNumber: true })}
          />
          {errors.lengthCm && (
            <p className="text-sm text-destructive">{String(errors.lengthCm.message)}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}widthCm`}>Width (cm)</Label>
          <Input
            id={`${idPrefix}widthCm`}
            type="number"
            step="0.1"
            min="0"
            {...register("widthCm" as Path<T>, { valueAsNumber: true })}
          />
          {errors.widthCm && (
            <p className="text-sm text-destructive">{String(errors.widthCm.message)}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}heightCm`}>Height (cm)</Label>
          <Input
            id={`${idPrefix}heightCm`}
            type="number"
            step="0.1"
            min="0"
            {...register("heightCm" as Path<T>, { valueAsNumber: true })}
          />
          {errors.heightCm && (
            <p className="text-sm text-destructive">{String(errors.heightCm.message)}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}packageCount`}>Package Count</Label>
          <Input
            id={`${idPrefix}packageCount`}
            type="number"
            step="1"
            min="1"
            defaultValue={idPrefix ? undefined : 1}
            {...register("packageCount" as Path<T>, { valueAsNumber: true })}
          />
          {errors.packageCount && (
            <p className="text-sm text-destructive">{String(errors.packageCount.message)}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Calculated CBM</Label>
          <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-base font-medium">
            {metrics ? formatCbm(metrics.totalCbm) : "Enter dimensions"}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Volumetric Weight</Label>
          <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-base font-medium">
            {metrics ? `${metrics.volumetricWeightKg.toFixed(2)} kg` : "Enter dimensions"}
          </div>
        </div>
        {showContainer && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}containerType`}>Container</Label>
            <select
              id={`${idPrefix}containerType`}
              className={formSelectClass}
              value={containerType}
              onChange={(event) => setContainerType(event.target.value as ContainerType)}
            >
              {Object.entries(CONTAINER_CAPACITIES).map(([key, spec]) => (
                <option key={key} value={key}>
                  {spec.label} ({spec.cbm} m³)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {showContainer && (
        <div className="flex flex-col gap-2">
          <Label>Container Status</Label>
          <div
            className={cn(
              "rounded-lg border px-3 py-2.5 text-base font-medium",
              containerStatusClass
            )}
          >
            {metrics ? formatContainerStatus(metrics) : "Enter dimensions to check container fill"}
          </div>
          {metrics && metrics.maxPackages > 0 && (
            <p className="text-sm text-muted-foreground">
              Fits up to {metrics.maxPackages} package{metrics.maxPackages === 1 ? "" : "s"} of this
              size in the selected container ({metrics.singlePackageCbm.toFixed(3)} m³ each).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
