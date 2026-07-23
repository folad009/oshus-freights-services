"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCbm } from "@/lib/helpers";
import { ShipmentType } from "@/types/enums";
import {
  CONTAINER_CAPACITIES,
  type ContainerType,
  type PackageInputMode,
  type ShipmentPackageEntry,
  aggregateShipmentPackages,
  analyzePackageMetrics,
  createShipmentPackageEntry,
  defaultContainerType,
  formatContainerStatus,
  resolvePackageEntryCbm,
  resolvePackageEntryWeight,
  usesContainerCapacity,
} from "@/lib/shipment-metrics";
import { cn } from "@/lib/utils";
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";

type ShipmentPackagesPanelProps = {
  packages: ShipmentPackageEntry[];
  onChange: (packages: ShipmentPackageEntry[]) => void;
  shipmentType?: ShipmentType;
  showContainerDetails?: boolean;
  errors?: Record<string, string>;
};

function parseNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function PackageEntryCard({
  entry,
  index,
  shipmentType,
  showContainerDetails,
  error,
  canRemove,
  onChange,
  onRemove,
}: {
  entry: ShipmentPackageEntry;
  index: number;
  shipmentType?: ShipmentType;
  showContainerDetails?: boolean;
  error?: string;
  canRemove: boolean;
  onChange: (entry: ShipmentPackageEntry) => void;
  onRemove: () => void;
}) {
  const showContainer =
    showContainerDetails && shipmentType ? usesContainerCapacity(shipmentType) : false;
  const [containerType, setContainerType] = useState<ContainerType>("CONTAINER_40FT");

  useEffect(() => {
    if (shipmentType) {
      setContainerType(defaultContainerType(shipmentType));
    }
  }, [shipmentType]);

  const metrics = useMemo(() => {
    if (entry.inputMode !== "dimensions") return null;
    if (!entry.lengthCm || !entry.widthCm || !entry.heightCm) return null;
    if (entry.lengthCm <= 0 || entry.widthCm <= 0 || entry.heightCm <= 0) return null;

    const count = entry.packageCount > 0 ? entry.packageCount : 1;
    return analyzePackageMetrics({
      lengthCm: entry.lengthCm,
      widthCm: entry.widthCm,
      heightCm: entry.heightCm,
      packageCount: count,
      containerCbm: CONTAINER_CAPACITIES[containerType].cbm,
    });
  }, [entry, containerType]);

  const lineWeight = resolvePackageEntryWeight(entry);
  const lineCbm = resolvePackageEntryCbm(entry);

  const containerStatusClass = metrics
    ? metrics.overflowPackages > 0
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : metrics.isFull
        ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700"
        : "border-amber-500/40 bg-amber-500/5 text-amber-800"
    : "border-dashed border-input bg-muted/40 text-muted-foreground";

  function updateEntry(patch: Partial<ShipmentPackageEntry>) {
    onChange({ ...entry, ...patch });
  }

  function setInputMode(mode: PackageInputMode) {
    if (mode === entry.inputMode) return;

    if (mode === "weight") {
      onChange({
        ...entry,
        inputMode: mode,
        lengthCm: undefined,
        widthCm: undefined,
        heightCm: undefined,
      });
      return;
    }

    onChange({
      ...entry,
      inputMode: mode,
      weight: undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Package {index + 1}</p>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            entry.inputMode === "weight"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setInputMode("weight")}
        >
          Weight only
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            entry.inputMode === "dimensions"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setInputMode("dimensions")}
        >
          Dimensions
        </button>
      </div>

      {entry.inputMode === "weight" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`package-${entry.id}-weight`}>Weight (kg)</Label>
            <Input
              id={`package-${entry.id}-weight`}
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 25"
              value={entry.weight ?? ""}
              onChange={(event) => updateEntry({ weight: parseNumber(event.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`package-${entry.id}-count`}>Package Count</Label>
            <Input
              id={`package-${entry.id}-count`}
              type="number"
              step="1"
              min="1"
              value={entry.packageCount ?? 1}
              onChange={(event) =>
                updateEntry({ packageCount: parseNumber(event.target.value) ?? 1 })
              }
            />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Enter size in centimeters (cm). Volumetric weight is calculated from volume.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`package-${entry.id}-length`}>Length (cm)</Label>
              <Input
                id={`package-${entry.id}-length`}
                type="number"
                step="0.1"
                min="0"
                value={entry.lengthCm ?? ""}
                onChange={(event) => updateEntry({ lengthCm: parseNumber(event.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`package-${entry.id}-width`}>Width (cm)</Label>
              <Input
                id={`package-${entry.id}-width`}
                type="number"
                step="0.1"
                min="0"
                value={entry.widthCm ?? ""}
                onChange={(event) => updateEntry({ widthCm: parseNumber(event.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`package-${entry.id}-height`}>Height (cm)</Label>
              <Input
                id={`package-${entry.id}-height`}
                type="number"
                step="0.1"
                min="0"
                value={entry.heightCm ?? ""}
                onChange={(event) => updateEntry({ heightCm: parseNumber(event.target.value) })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`package-${entry.id}-count-dim`}>Package Count</Label>
              <Input
                id={`package-${entry.id}-count-dim`}
                type="number"
                step="1"
                min="1"
                value={entry.packageCount ?? 1}
                onChange={(event) =>
                  updateEntry({ packageCount: parseNumber(event.target.value) ?? 1 })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Calculated CBM</Label>
              <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-base font-medium">
                {lineCbm != null ? formatCbm(lineCbm) : "Enter dimensions"}
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Volumetric Weight</Label>
              <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-muted/40 px-3 text-base font-medium">
                {lineWeight > 0 ? `${lineWeight.toFixed(2)} kg` : "Enter dimensions"}
              </div>
            </div>
            {showContainer && (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`package-${entry.id}-container`}>Container</Label>
                <select
                  id={`package-${entry.id}-container`}
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
            </div>
          )}
        </>
      )}

      {lineWeight > 0 && (
        <p className="text-sm text-muted-foreground">
          Line weight: {lineWeight.toFixed(2)} kg
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ShipmentPackagesPanel({
  packages,
  onChange,
  shipmentType,
  showContainerDetails = true,
  errors = {},
}: ShipmentPackagesPanelProps) {
  const totals = useMemo(() => aggregateShipmentPackages(packages), [packages]);

  function updatePackage(index: number, entry: ShipmentPackageEntry) {
    onChange(packages.map((pkg, pkgIndex) => (pkgIndex === index ? entry : pkg)));
  }

  function removePackage(index: number) {
    onChange(packages.filter((_, pkgIndex) => pkgIndex !== index));
  }

  function addPackage() {
    onChange([...packages, createShipmentPackageEntry("weight")]);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-base font-medium">Package Details</p>
        <p className="text-sm text-muted-foreground">
          Add one or more packages using weight only or dimensions for each line.
        </p>
      </div>

      <div className="space-y-3">
        {packages.map((entry, index) => (
          <PackageEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            shipmentType={shipmentType}
            showContainerDetails={showContainerDetails}
            error={errors[entry.id]}
            canRemove={packages.length > 1}
            onChange={(updated) => updatePackage(index, updated)}
            onRemove={() => removePackage(index)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={addPackage}>
        <Plus />
        Add more
      </Button>

      {packages.length > 1 && (
        <div className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium">Shipment totals</p>
          <p className="text-muted-foreground">
            {totals.packageCount} package{totals.packageCount === 1 ? "" : "s"} ·{" "}
            {totals.weight.toFixed(2)} kg
            {totals.cbm != null ? ` · ${formatCbm(totals.cbm)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export { createShipmentPackageEntry };
