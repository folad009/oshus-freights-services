"use client";

import { useEffect } from "react";
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
import { SHIPMENT_STATUS_LABELS } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface ShipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId?: string | null;
  onSuccess?: () => void;
}

async function fetchCustomers() {
  const res = await fetch("/api/customers");
  const json = await res.json();
  return json.success ? json.data : [];
}

async function fetchWarehouses() {
  const res = await fetch("/api/warehouses");
  const json = await res.json();
  return json.success ? json.data : [];
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

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    enabled: open && !isCustomer,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: fetchWarehouses,
    enabled: open && !isCustomer,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateShipmentInput>({
    resolver: zodResolver(createShipmentSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        shipmentType: ShipmentType.STANDARD,
        weight: undefined,
        origin: "",
        destination: "",
        customerId: "",
        warehouseId: "",
        scheduledPickup: "",
        notes: "",
      });
    }
  }, [open, reset]);

  async function onSubmit(data: CreateShipmentInput) {
    if (!isCustomer && !data.customerId) {
      toast.error("Please select a customer");
      return;
    }
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create shipment");
        return;
      }
      toast.success("Shipment created");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {!isCustomer && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerId">Customer</Label>
          <select id="customerId" className={selectClass} {...register("customerId")}>
            <option value="">Select customer</option>
            {customers?.map((c: { id: string; companyName: string }) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isCustomer && (
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

      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" step="0.1" {...register("weight", { valueAsNumber: true })} />
          {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
        </div>
      </div>

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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create Shipment"}
        </Button>
      </DialogFooter>
    </form>
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
  const canAssignWarehouse = ["ADMIN", "DISPATCHER"].includes(session?.user?.role ?? "");

  const { data: shipment } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => fetchShipment(shipmentId),
    enabled: open,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: fetchWarehouses,
    enabled: open && canAssignWarehouse,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateShipmentInput>({
    resolver: zodResolver(updateShipmentSchema),
  });

  useEffect(() => {
    if (open && shipment) {
      reset({
        shipmentType: shipment.shipmentType,
        weight: shipment.weight,
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
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-weight">Weight (kg)</Label>
          <Input id="edit-weight" type="number" step="0.1" {...register("weight", { valueAsNumber: true })} />
          {errors.weight && <p className="text-sm text-destructive">{errors.weight.message}</p>}
        </div>
      </div>

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

      {canAssignWarehouse && (
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
        <Button type="submit" disabled={isSubmitting || !shipment}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
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

        {isEdit && shipmentId ? (
          <ShipmentEditForm
            open={open}
            shipmentId={shipmentId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <ShipmentCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
