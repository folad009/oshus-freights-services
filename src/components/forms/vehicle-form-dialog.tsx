"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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
import { formSelectClass } from "@/components/forms/shipment-package-metrics-panel";
import {
  createVehicleSchema,
  updateVehicleSchema,
  type CreateVehicleInput,
  type UpdateVehicleInput,
} from "@/lib/validations";
import { getVehicleStatusOptions, getVehicleTypeOptions } from "@/lib/fleet";
import { VehicleType } from "@/types/enums";

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string | null;
  onSuccess?: () => void;
}

async function fetchVehicle(id: string) {
  const res = await fetch(`/api/vehicles/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function VehicleCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: Omit<VehicleFormDialogProps, "vehicleId">) {
  const typeOptions = getVehicleTypeOptions();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      plateNumber: "",
      type: VehicleType.VAN,
      capacity: 1000,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        plateNumber: "",
        type: VehicleType.VAN,
        capacity: 1000,
      });
    }
  }, [open, reset]);

  async function onSubmit(data: CreateVehicleInput) {
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to add vehicle");
        return;
      }
      toast.success("Vehicle added");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="plateNumber">
          Plate Number <span className="text-destructive">*</span>
        </Label>
        <Input id="plateNumber" placeholder="OSH-1234" {...register("plateNumber")} />
        {errors.plateNumber && (
          <p className="text-sm text-destructive">{errors.plateNumber.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">
            Vehicle Type <span className="text-destructive">*</span>
          </Label>
          <select id="type" className={formSelectClass} {...register("type")}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="capacity">
            Capacity (kg) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            step="1"
            {...register("capacity", { valueAsNumber: true })}
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Add Vehicle"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function VehicleEditForm({
  open,
  vehicleId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  vehicleId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const typeOptions = getVehicleTypeOptions();
  const statusOptions = getVehicleStatusOptions();

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-item", vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
    enabled: open && !!vehicleId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateVehicleInput>({
    resolver: zodResolver(updateVehicleSchema),
  });

  useEffect(() => {
    if (open && vehicle) {
      reset({
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        capacity: vehicle.capacity,
        status: vehicle.status,
        fuelUsage: vehicle.fuelUsage,
        lastMaintenance: toDateInputValue(vehicle.lastMaintenance),
        nextMaintenance: toDateInputValue(vehicle.nextMaintenance),
      });
    }
  }, [open, vehicle, reset]);

  async function onSubmit(data: UpdateVehicleInput) {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          lastMaintenance: data.lastMaintenance || null,
          nextMaintenance: data.nextMaintenance || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to update vehicle");
        return;
      }
      toast.success("Vehicle updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-plateNumber">Plate Number</Label>
        <Input id="edit-plateNumber" {...register("plateNumber")} />
        {errors.plateNumber && (
          <p className="text-sm text-destructive">{errors.plateNumber.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-type">Vehicle Type</Label>
          <select id="edit-type" className={formSelectClass} {...register("type")}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select id="edit-status" className={formSelectClass} {...register("status")}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-capacity">Capacity (kg)</Label>
          <Input
            id="edit-capacity"
            type="number"
            min="1"
            step="1"
            {...register("capacity", { valueAsNumber: true })}
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-fuelUsage">Fuel Usage (L)</Label>
          <Input
            id="edit-fuelUsage"
            type="number"
            min="0"
            step="0.1"
            {...register("fuelUsage", { valueAsNumber: true })}
          />
          {errors.fuelUsage && (
            <p className="text-sm text-destructive">{errors.fuelUsage.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-lastMaintenance">Last Maintenance</Label>
          <Input id="edit-lastMaintenance" type="date" {...register("lastMaintenance")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-nextMaintenance">Next Maintenance</Label>
          <Input id="edit-nextMaintenance" type="date" {...register("nextMaintenance")} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !vehicle}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicleId,
  onSuccess,
}: VehicleFormDialogProps) {
  const isEdit = !!vehicleId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update vehicle details, status, and maintenance schedule."
              : "Register a new vehicle in the fleet."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && vehicleId ? (
          <VehicleEditForm
            open={open}
            vehicleId={vehicleId}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : (
          <VehicleCreateForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
