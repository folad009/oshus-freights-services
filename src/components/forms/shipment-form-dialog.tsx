"use client";

import Link from "next/link";
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
import { ShipmentType, ShipmentStatus, GovernmentIdType } from "@/types/enums";
import {
  calculateInsuranceCost,
  calculateShipmentInvoiceBreakdown,
  DELIVERY_SERVICE_FEE,
  PICKUP_SERVICE_FEE,
} from "@/lib/billing";
import { formatCurrency, SHIPMENT_STATUS_LABELS } from "@/lib/helpers";
import { getShipmentTypeOptions } from "@/lib/shipment-types";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";
import {
  buildShipmentPackagePayload,
  inferPackageInputMode,
  type PackageInputMode,
} from "@/lib/shipment-metrics";
import {
  PackageMetricsPanel,
  formSelectClass,
} from "@/components/forms/shipment-package-metrics-panel";
import { ShipmentIntakeLinkPanel } from "@/components/forms/shipment-intake-link-panel";
import { TermsAcceptanceField } from "@/components/terms-acceptance-field";
import {
  IdDocumentUploadField,
  uploadCustomerIdDocument,
  validateIdDocumentFields,
} from "@/components/forms/id-document-upload-field";
import { cn } from "@/lib/utils";

interface ShipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId?: string | null;
  onSuccess?: (shipmentId?: string) => void | Promise<void>;
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
  const isWarehouseStaff = role === UserRole.WAREHOUSE_STAFF;
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
    resetField,
    formState: { errors },
  } = useForm<CreateShipmentInput>({
    defaultValues: {
      shipmentType: ShipmentType.STANDARD_AIR_FREIGHT,
      packageCount: 1,
      origin: "",
      destination: "",
      customerId: "",
      warehouseId: "",
      scheduledPickup: "",
      notes: "",
      requestPickup: false,
      requestDelivery: false,
      pickupAddress: "",
      deliveryAddress: "",
      hasInsurance: false,
      acceptedTerms: false,
    },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [staffMode, setStaffMode] = useState<"create" | "link">("create");
  const [idDocumentType, setIdDocumentType] = useState<GovernmentIdType | "">("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [idDocumentError, setIdDocumentError] = useState("");
  const [packageInputMode, setPackageInputMode] = useState<PackageInputMode>("dimensions");

  const shipmentType = watch("shipmentType");
  const lengthCm = watch("lengthCm");
  const widthCm = watch("widthCm");
  const heightCm = watch("heightCm");
  const packageCount = watch("packageCount");
  const requestPickup = watch("requestPickup");
  const requestDelivery = watch("requestDelivery");
  const hasInsurance = watch("hasInsurance");
  const declaredValue = watch("declaredValue");
  const weight = watch("weight");

  const shipmentTypeOptions = getShipmentTypeOptions(isCustomer);

  const costEstimate = useMemo(() => {
    if (!isCustomer || !shipmentType || !weight || weight <= 0) return null;
    return calculateShipmentInvoiceBreakdown({
      shipmentType,
      weight,
      requestPickup: !!requestPickup,
      requestDelivery: !!requestDelivery,
      hasInsurance: !!hasInsurance,
      declaredValue,
    });
  }, [
    isCustomer,
    shipmentType,
    weight,
    requestPickup,
    requestDelivery,
    hasInsurance,
    declaredValue,
  ]);

  useEffect(() => {
    if (open) {
      setAcceptedTerms(false);
      setStaffMode("create");
      setIdDocumentType("");
      setIdDocumentNumber("");
      setIdDocumentFile(null);
      setIdDocumentError("");
      setPackageInputMode("dimensions");
      reset({
        shipmentType: ShipmentType.STANDARD_AIR_FREIGHT,
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
        requestPickup: false,
        requestDelivery: false,
        pickupAddress: "",
        deliveryAddress: "",
        hasInsurance: false,
        declaredValue: undefined,
        acceptedTerms: false,
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open || isCustomer || !isWarehouseStaff || !warehouses?.length) return;
    if (warehouses.length === 1) {
      setValue("warehouseId", warehouses[0].id);
    }
  }, [open, isCustomer, isWarehouseStaff, warehouses, setValue]);

  function handlePackageInputModeChange(mode: PackageInputMode) {
    setPackageInputMode(mode);
    if (mode === "weight") {
      resetField("lengthCm");
      resetField("widthCm");
      resetField("heightCm");
    } else {
      resetField("weight");
    }
  }

  async function handleCreateClick() {
    if (isCreating) return;
    clearErrors();

    if (isCustomer && !acceptedTerms) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    if (isCustomer) {
      try {
        validateIdDocumentFields(idDocumentType, idDocumentNumber, idDocumentFile);
        setIdDocumentError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid ID document";
        setIdDocumentError(message);
        toast.error(message);
        return;
      }
    }

    const values = getValues();

    if (!isCustomer && !values.customerId?.trim()) {
      setError("customerId", { message: "Please select a customer" });
      toast.error("Please select a customer");
      return;
    }

    const packagePayload = buildShipmentPackagePayload(values, packageInputMode);

    const parsed = createShipmentSchema.safeParse({
      ...values,
      ...packagePayload,
      customerId: values.customerId?.trim() || undefined,
      warehouseId: values.warehouseId?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      scheduledPickup: values.scheduledPickup?.trim() || undefined,
      pickupAddress: values.pickupAddress?.trim() || undefined,
      deliveryAddress: values.deliveryAddress?.trim() || undefined,
      acceptedTerms: isCustomer ? acceptedTerms : undefined,
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
      let idDocumentStorageKey: string | undefined;
      let uploadedIdDocumentType: GovernmentIdType | undefined;
      let uploadedIdDocumentNumber: string | undefined;

      if (isCustomer && idDocumentFile && idDocumentType) {
        const uploaded = await uploadCustomerIdDocument(
          idDocumentFile,
          idDocumentType,
          idDocumentNumber
        );
        idDocumentStorageKey = uploaded.storageKey;
        uploadedIdDocumentType = uploaded.idDocumentType;
        uploadedIdDocumentNumber = uploaded.idDocumentNumber;
      }

      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          idDocumentStorageKey,
          idDocumentType: uploadedIdDocumentType,
          idDocumentNumber: uploadedIdDocumentNumber,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create shipment");
        return;
      }
      toast.success(`Shipment ${json.data.trackingNumber} created`);
      onOpenChange(false);
      await onSuccess?.(json.data.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isCustomer && (
        <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2.5 text-base font-medium transition-colors",
              staffMode === "create"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setStaffMode("create")}
          >
            Enter details
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2.5 text-base font-medium transition-colors",
              staffMode === "link"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setStaffMode("link")}
          >
            Customer intake link
          </button>
        </div>
      )}

      {!isCustomer && staffMode === "link" ? (
        <ShipmentIntakeLinkPanel role={role} onClose={() => onOpenChange(false)} />
      ) : (
        <>
      {!isCustomer && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerId">
            Customer <span className="text-destructive">*</span>
          </Label>
          <select id="customerId" className={formSelectClass} {...register("customerId")}>
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
          <select id="warehouseId" className={formSelectClass} {...register("warehouseId")}>
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
        <Label htmlFor="shipmentType">Type of Shipment</Label>
        <select id="shipmentType" className={formSelectClass} {...register("shipmentType")}>
          {shipmentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <PackageMetricsPanel
        register={register}
        errors={errors}
        shipmentType={shipmentType}
        lengthCm={lengthCm ?? undefined}
        widthCm={widthCm ?? undefined}
        heightCm={heightCm ?? undefined}
        packageCount={packageCount}
        weight={weight}
        packageInputMode={packageInputMode}
        onPackageInputModeChange={handlePackageInputModeChange}
        onWeightChange={(nextWeight) => setValue("weight", nextWeight)}
        showContainerDetails={!isCustomer}
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

      {isCustomer && (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <div>
            <p className="text-base font-medium">Door services</p>
            <p className="text-sm text-muted-foreground">
              Optional pickup and delivery by our logistics team. Fees are billed separately from
              freight ({formatCurrency(PICKUP_SERVICE_FEE)} pickup ·{" "}
              {formatCurrency(DELIVERY_SERVICE_FEE)} delivery).
            </p>
          </div>
          <label className="flex items-start gap-2 text-base">
            <input type="checkbox" className="mt-1 size-4" {...register("requestPickup")} />
            <span>Request door pickup — we collect the package from your location</span>
          </label>
          {requestPickup && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="pickupAddress">Pickup address</Label>
              <Input
                id="pickupAddress"
                placeholder="Street, city, postal code"
                {...register("pickupAddress")}
              />
              {errors.pickupAddress && (
                <p className="text-sm text-destructive">{errors.pickupAddress.message}</p>
              )}
            </div>
          )}
          <label className="flex items-start gap-2 text-base">
            <input type="checkbox" className="mt-1 size-4" {...register("requestDelivery")} />
            <span>Request door delivery — we deliver to the recipient at destination</span>
          </label>
          {requestDelivery && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="deliveryAddress">Delivery address</Label>
              <Input
                id="deliveryAddress"
                placeholder="Street, city, postal code"
                {...register("deliveryAddress")}
              />
              {errors.deliveryAddress && (
                <p className="text-sm text-destructive">{errors.deliveryAddress.message}</p>
              )}
            </div>
          )}
          {requestPickup && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="scheduledPickup">Preferred pickup date & time</Label>
              <Input id="scheduledPickup" type="datetime-local" {...register("scheduledPickup")} />
            </div>
          )}
        </div>
      )}

      {isCustomer && (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <div>
            <p className="text-base font-medium">Insurance coverage</p>
            <p className="text-sm text-muted-foreground">
              Optional cargo insurance based on declared value (minimum premium applies).
            </p>
          </div>
          <label className="flex items-start gap-2 text-base">
            <input type="checkbox" className="mt-1 size-4" {...register("hasInsurance")} />
            <span>Add insurance coverage for this shipment</span>
          </label>
          {hasInsurance && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="declaredValue">Declared value (USD)</Label>
              <Input
                id="declaredValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000"
                {...register("declaredValue", { valueAsNumber: true })}
              />
              {errors.declaredValue && (
                <p className="text-sm text-destructive">{errors.declaredValue.message}</p>
              )}
              {declaredValue && declaredValue > 0 && (
                <p className="text-sm text-muted-foreground">
                  Estimated insurance: {formatCurrency(calculateInsuranceCost(declaredValue))}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!isCustomer && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduledPickup">Scheduled Pickup</Label>
          <Input id="scheduledPickup" type="datetime-local" {...register("scheduledPickup")} />
        </div>
      )}

      {isCustomer && costEstimate && (
        <div className="rounded-lg border bg-muted/40 p-3 text-base">
          <p className="font-medium">Estimated invoice</p>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Freight</span>
              <span>{formatCurrency(costEstimate.baseAmount)}</span>
            </div>
            {costEstimate.pickupCost > 0 && (
              <div className="flex justify-between">
                <span>Door pickup</span>
                <span>{formatCurrency(costEstimate.pickupCost)}</span>
              </div>
            )}
            {costEstimate.deliveryCost > 0 && (
              <div className="flex justify-between">
                <span>Door delivery</span>
                <span>{formatCurrency(costEstimate.deliveryCost)}</span>
              </div>
            )}
            {costEstimate.insuranceCost > 0 && (
              <div className="flex justify-between">
                <span>Insurance</span>
                <span>{formatCurrency(costEstimate.insuranceCost)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-medium text-foreground">
              <span>Total (incl. tax)</span>
              <span>{formatCurrency(costEstimate.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {isCustomer && (
        <IdDocumentUploadField
          idDocumentType={idDocumentType}
          onIdDocumentTypeChange={setIdDocumentType}
          idDocumentNumber={idDocumentNumber}
          onIdDocumentNumberChange={setIdDocumentNumber}
          selectedFile={idDocumentFile}
          onSelectedFileChange={setIdDocumentFile}
          error={idDocumentError}
        />
      )}

      {isCustomer && (
        <TermsAcceptanceField checked={acceptedTerms} onChange={setAcceptedTerms} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          className={cn(formSelectClass, "h-auto py-2 resize-none")}
          placeholder="Optional instructions or notes"
          {...register("notes")}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={isCreating || (isCustomer && !acceptedTerms)} onClick={() => void handleCreateClick()}>
          {isCreating ? "Creating..." : "Create Shipment"}
        </Button>
      </DialogFooter>
        </>
      )}
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

  const [packageInputMode, setPackageInputMode] = useState<PackageInputMode>("dimensions");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<UpdateShipmentInput>({
    resolver: zodResolver(updateShipmentSchema),
  });

  useEffect(() => {
    if (open && shipment) {
      setPackageInputMode(inferPackageInputMode(shipment));
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
  const weight = watch("weight");

  function handlePackageInputModeChange(mode: PackageInputMode) {
    setPackageInputMode(mode);
    if (mode === "weight") {
      setValue("lengthCm", null);
      setValue("widthCm", null);
      setValue("heightCm", null);
    } else {
      resetField("weight");
    }
  }

  async function onSubmit(data: UpdateShipmentInput) {
    const packagePayload =
      packageInputMode === "dimensions"
        ? buildShipmentPackagePayload(data, "dimensions")
        : {
            weight: Number(data.weight),
            lengthCm: null,
            widthCm: null,
            heightCm: null,
            packageCount: data.packageCount ?? 1,
          };

    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...packagePayload,
        }),
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
        <select id="edit-shipmentType" className={formSelectClass} {...register("shipmentType")}>
          {getShipmentTypeOptions(false).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <PackageMetricsPanel
        register={register as ReturnType<typeof useForm<CreateShipmentInput>>["register"]}
        errors={errors}
        shipmentType={shipmentType}
        lengthCm={lengthCm ?? undefined}
        widthCm={widthCm ?? undefined}
        heightCm={heightCm ?? undefined}
        packageCount={packageCount}
        weight={weight}
        packageInputMode={packageInputMode}
        onPackageInputModeChange={handlePackageInputModeChange}
        onWeightChange={(nextWeight) => setValue("weight", nextWeight, { shouldValidate: true })}
        idPrefix="edit-"
      />

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
          <select id="edit-warehouseId" className={formSelectClass} {...register("warehouseId")}>
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
          <select id="edit-status" className={formSelectClass} {...register("status")}>
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
          className={cn(formSelectClass, "h-auto py-2 resize-none")}
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
  const { data: session } = useSession();
  const isCustomer = session?.user?.role === UserRole.CUSTOMER;
  const isEdit = !!shipmentId && !isCustomer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shipment" : "New Shipment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update shipment details and status."
              : isCustomer
                ? "Submit a shipment request. Review optional services and accept terms before booking."
                : "Create a shipment directly or generate a link for a new customer to submit their details."}
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
