"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createShipmentSchema,
  updateShipmentSchema,
  type CreateShipmentInput,
  type UpdateShipmentInput,
} from "@/lib/validations";
import { ShipmentType, ShipmentStatus } from "@/types/enums";
import { SHIPMENT_STATUS_LABELS, formatCbm } from "@/lib/helpers";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";
import {
  CONTAINER_CAPACITIES,
  type ContainerType,
  analyzePackageMetrics,
  calculateVolumetricWeightKg,
  defaultContainerType,
  formatContainerStatus,
  usesContainerCapacity,
} from "@/lib/shipment-metrics";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type DimensionErrors = {
  lengthCm?: { message?: string };
  widthCm?: { message?: string };
  heightCm?: { message?: string };
  packageCount?: { message?: string };
};

function PackageMetricsPanel({
  register,
  errors,
  shipmentType,
  lengthCm,
  widthCm,
  heightCm,
  packageCount,
  onWeightChange,
  idPrefix = "",
}: {
  register: ReturnType<typeof useForm<CreateShipmentInput>>["register"];
  errors: DimensionErrors;
  shipmentType?: ShipmentType;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageCount?: number;
  onWeightChange?: (weight: number) => void;
  idPrefix?: string;
}) {
  const showContainer = shipmentType ? usesContainerCapacity(shipmentType) : false;
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
        <p className="text-sm font-medium">Package Dimensions</p>
        <p className="text-xs text-muted-foreground">
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
            {...register("lengthCm", { valueAsNumber: true })}
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
            {...register("widthCm", { valueAsNumber: true })}
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
            {...register("heightCm", { valueAsNumber: true })}
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
            {...register("packageCount", { valueAsNumber: true })}
          />
          {errors.packageCount && (
            <p className="text-sm text-destructive">{String(errors.packageCount.message)}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Calculated CBM</Label>
          <div className="flex h-8 items-center rounded-lg border border-dashed border-input bg-muted/40 px-2.5 text-sm font-medium">
            {metrics ? formatCbm(metrics.totalCbm) : "Enter dimensions"}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Volumetric Weight</Label>
          <div className="flex h-8 items-center rounded-lg border border-dashed border-input bg-muted/40 px-2.5 text-sm font-medium">
            {metrics ? `${metrics.volumetricWeightKg.toFixed(2)} kg` : "Enter dimensions"}
          </div>
        </div>
        {showContainer && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}containerType`}>Container</Label>
            <select
              id={`${idPrefix}containerType`}
              className={selectClass}
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
              "rounded-lg border px-2.5 py-2 text-sm font-medium",
              containerStatusClass
            )}
          >
            {metrics ? formatContainerStatus(metrics) : "Enter dimensions to check container fill"}
          </div>
          {metrics && metrics.maxPackages > 0 && (
            <p className="text-xs text-muted-foreground">
              Fits up to {metrics.maxPackages} package{metrics.maxPackages === 1 ? "" : "s"} of this
              size in the selected container ({metrics.singlePackageCbm.toFixed(3)} m³ each).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ShipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId?: string | null;
  onSuccess?: () => void | Promise<void>;
}

async function fetchCustomers() {
  const res = await fetch("/api/customers");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchWarehouseOptions() {
  const res = await fetch("/api/warehouses/options");
  const json = await res.json();
  return json.success ? json.data : [];
}

function canSelectWarehouse(role: UserRole | undefined) {
  if (!role || role === UserRole.CUSTOMER) return false;
  return (
    hasPermission(role, "warehouses:read") ||
    hasPermission(role, "shipments:write") ||
    hasPermission(role, "shipments:assign")
  );
}

async function fetchShipment(id: string) {
  const res = await fetch(`/api/shipments/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function ShipmentCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<ShipmentFormDialogProps, "shipmentId">) {
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === "CUSTOMER";
  const role = session?.user?.role as UserRole | undefined;
  const showWarehouseField = canSelectWarehouse(role);

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: open && !isCustomer,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: fetchWarehouseOptions,
    enabled: open && showWarehouseField,
  });

  const {
    register,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateShipmentInput>({
    defaultValues: {
      shipmentType: ShipmentType.STANDARD,
      packageCount: 1,
      origin: "",
      destination: "",
      customerId: "",
      warehouseId: "",
      scheduledPickup: "",
      notes: "",
    },
  });

  const [isCreating, setIsCreating] = useState(false);

  const shipmentType = watch("shipmentType");
  const lengthCm = watch("lengthCm");
  const widthCm = watch("widthCm");
  const heightCm = watch("heightCm");
  const packageCount = watch("packageCount");

  useEffect(() => {
    if (open) {
      reset({
        shipmentType: ShipmentType.STANDARD,
        weight: undefined,
        lengthCm: undefined,
        widthCm: undefined,
        heightCm: undefined,
        packageCount: 1,
        origin: "",
        destination: "",
        customerId: "",
        warehouseId: "",
        scheduledPickup: "",
        notes: "",
      });
    }
  }, [open, reset]);

  async function handleCreateClick() {
    if (isCreating) return;
    clearErrors();

    const values = getValues();

    if (!isCustomer && !values.customerId?.trim()) {
      setError("customerId", { message: "Please select a customer" });
      toast.error("Please select a customer");
      return;
    }

    const weight = calculateVolumetricWeightKg({
      lengthCm: Number(values.lengthCm),
      widthCm: Number(values.widthCm),
      heightCm: Number(values.heightCm),
      packageCount: values.packageCount ?? 1,
    });

    const parsed = createShipmentSchema.safeParse({
      ...values,
      weight,
      customerId: values.customerId?.trim() || undefined,
      warehouseId: values.warehouseId?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      scheduledPickup: values.scheduledPickup?.trim() || undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0];
      toast.error(issue.message);
      if (typeof field === "string") {
        setError(field as keyof CreateShipmentInput, { message: issue.message });
      }
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create shipment");
        return;
      }
      toast.success(`Shipment ${json.data.trackingNumber} created`);
      onOpenChange(false);
      await onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isCustomer && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerId">
            Customer <span className="text-destructive">*</span>
          </Label>
          <select id="customerId" className={selectClass} {...register("customerId")}>
            <option value="">Select customer</option>
            {customers?.map((c: { id: string; companyName: string }) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
          {errors.customerId && (
            <p className="text-sm text-destructive">{errors.customerId.message}</p>
          )}
        </div>
      )}

      {!isCustomer && showWarehouseField && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="warehouseId">Warehouse Branch</Label>
          <select id="warehouseId" className={selectClass} {...register("warehouseId")}>
            <option value="">Assign later</option>
            {warehouses?.map((w: { id: string; code: string; name: string }) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="shipmentType">Type</Label>
        <select id="shipmentType" className={selectClass} {...register("shipmentType")}>
          {Object.values(ShipmentType).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <PackageMetricsPanel
        register={register}
        errors={errors}
        shipmentType={shipmentType}
        lengthCm={lengthCm}
        widthCm={widthCm}
        heightCm={heightCm}
        packageCount={packageCount}
        onWeightChange={(weight) => setValue("weight", weight)}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="origin">Origin</Label>
        <Input id="origin" placeholder="City, State" {...register("origin")} />
        {errors.origin && <p className="text-sm text-destructive">{errors.origin.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="destination">Destination</Label>
        <Input id="destination" placeholder="City, State" {...register("destination")} />
        {errors.destination && (
          <p className="text-sm text-destructive">{errors.destination.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduledPickup">Scheduled Pickup</Label>
        <Input id="scheduledPickup" type="datetime-local" {...register("scheduledPickup")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          className={cn(selectClass, "h-auto py-2 resize-none")}
          placeholder="Optional instructions or notes"
          {...register("notes")}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={isCreating} onClick={() => void handleCreateClick()}>
          {isCreating ? "Creating..." : "Create Shipment"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ShipmentEditForm({
  open,
  shipmentId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  shipmentId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { data: session } = useSession();
  const canChangeStatus = ["ADMIN", "DISPATCHER", "DRIVER"].includes(session?.user?.role ?? "");
  const role = session?.user?.role as UserRole | undefined;
  const showWarehouseField = canSelectWarehouse(role);

  const { data: shipment } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => fetchShipment(shipmentId),
    enabled: open,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouse-options"],
    queryFn: fetchWarehouseOptions,
    enabled: open && showWarehouseField,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateShipmentInput>({
    resolver: zodResolver(updateShipmentSchema),
  });

  useEffect(() => {
    if (open && shipment) {
      reset({
        shipmentType: shipment.shipmentType,
        weight: shipment.weight,
        lengthCm: shipment.lengthCm ?? undefined,
        widthCm: shipment.widthCm ?? undefined,
        heightCm: shipment.heightCm ?? undefined,
        packageCount: shipment.packageCount ?? 1,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        warehouseId: shipment.warehouseId ?? "",
        scheduledPickup: shipment.scheduledPickup
          ? new Date(shipment.scheduledPickup).toISOString().slice(0, 16)
          : "",
        estimatedDelivery: shipment.estimatedDelivery
          ? new Date(shipment.estimatedDelivery).toISOString().slice(0, 16)
          : "",
        notes: shipment.notes ?? "",
      });
    }
  }, [open, shipment, reset]);

  const shipmentType = watch("shipmentType");
  const lengthCm = watch("lengthCm");
  const widthCm = watch("widthCm");
  const heightCm = watch("heightCm");
  const packageCount = watch("packageCount");

  async function onSubmit(data: UpdateShipmentInput) {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update shipment");
        return;
      }
      toast.success("Shipment updated");
      onOpenChange(false);
      await onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const submitForm = handleSubmit(onSubmit, (fieldErrors) => {
    const firstError = Object.values(fieldErrors).find((error) => error?.message);
    toast.error(firstError?.message ?? "Please complete all required fields");
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-shipmentType">Type</Label>
        <select id="edit-shipmentType" className={selectClass} {...register("shipmentType")}>
          {Object.values(ShipmentType).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <PackageMetricsPanel
        register={register as ReturnType<typeof useForm<CreateShipmentInput>>["register"]}
        errors={errors}
        shipmentType={shipmentType}
        lengthCm={lengthCm}
        widthCm={widthCm}
        heightCm={heightCm}
        packageCount={packageCount}
        onWeightChange={(weight) => setValue("weight", weight, { shouldValidate: true })}
        idPrefix="edit-"
      />

      <input type="hidden" {...register("weight", { valueAsNumber: true })} />
      {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-origin">Origin</Label>
        <Input id="edit-origin" placeholder="City, State" {...register("origin")} />
        {errors.origin && <p className="text-sm text-destructive">{errors.origin.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-destination">Destination</Label>
        <Input id="edit-destination" placeholder="City, State" {...register("destination")} />
        {errors.destination && (
          <p className="text-sm text-destructive">{errors.destination.message}</p>
        )}
      </div>

      {showWarehouseField && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-warehouseId">Warehouse Branch</Label>
          <select id="edit-warehouseId" className={selectClass} {...register("warehouseId")}>
            <option value="">Unassigned</option>
            {warehouses?.map((w: { id: string; code: string; name: string }) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {canChangeStatus && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select id="edit-status" className={selectClass} {...register("status")}>
            {Object.values(ShipmentStatus).map((s) => (
              <option key={s} value={s}>
                {SHIPMENT_STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-scheduledPickup">Scheduled Pickup</Label>
          <Input id="edit-scheduledPickup" type="datetime-local" {...register("scheduledPickup")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-estimatedDelivery">Estimated Delivery</Label>
          <Input
            id="edit-estimatedDelivery"
            type="datetime-local"
            {...register("estimatedDelivery")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <textarea
          id="edit-notes"
          rows={3}
          className={cn(selectClass, "h-auto py-2 resize-none")}
          placeholder="Optional instructions or notes"
          {...register("notes")}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting || !shipment} onClick={() => void submitForm()}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ShipmentFormDialog({
  open,
  onOpenChange,
  shipmentId,
  onSuccess,
}: ShipmentFormDialogProps) {
  const isEdit = !!shipmentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shipment" : "New Shipment"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update shipment details and status." : "Create a new shipment request."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          isEdit && shipmentId ? (
            <ShipmentEditForm
              open={open}
              shipmentId={shipmentId}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ) : (
            <ShipmentCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
