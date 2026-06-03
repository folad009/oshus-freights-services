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
import { Label } from "@/components/ui/label";
import {
  assignShipmentSchema,
  type AssignShipmentInput,
} from "@/lib/validations";

const selectClass =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface ShipmentAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string | null;
  onSuccess?: () => void;
}

interface DriverOption {
  id: string;
  licenseNumber: string;
  vehicleId: string | null;
  user: { firstName: string; lastName: string };
  vehicle: { id: string; plateNumber: string; type: string } | null;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  type: string;
  status: string;
}

interface DispatcherOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

async function fetchDrivers() {
  const res = await fetch("/api/drivers");
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as DriverOption[];
}

async function fetchVehicles() {
  const res = await fetch("/api/vehicles");
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as VehicleOption[];
}

async function fetchDispatchers() {
  const res = await fetch("/api/dispatchers");
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as DispatcherOption[];
}

async function fetchShipment(id: string) {
  const res = await fetch(`/api/shipments/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export function ShipmentAssignDialog({
  open,
  onOpenChange,
  shipmentId,
  onSuccess,
}: ShipmentAssignDialogProps) {
  const { data: shipment } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => fetchShipment(shipmentId!),
    enabled: open && !!shipmentId,
  });

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: fetchDrivers,
    enabled: open,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
    enabled: open,
  });

  const { data: dispatchers } = useQuery({
    queryKey: ["dispatchers"],
    queryFn: fetchDispatchers,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<AssignShipmentInput>({
    resolver: zodResolver(assignShipmentSchema),
    defaultValues: { driverId: null, vehicleId: null, dispatcherId: null },
  });

  const selectedDriverId = watch("driverId");

  useEffect(() => {
    if (open && shipment) {
      reset({
        driverId: shipment.driverId ?? null,
        vehicleId: shipment.vehicleId ?? null,
        dispatcherId: shipment.dispatcherId ?? null,
      });
    }
  }, [open, shipment, reset]);

  useEffect(() => {
    if (!selectedDriverId || !drivers) return;
    const driver = drivers.find((d) => d.id === selectedDriverId);
    if (driver?.vehicleId) {
      setValue("vehicleId", driver.vehicleId);
    }
  }, [selectedDriverId, drivers, setValue]);

  async function onSubmit(data: AssignShipmentInput) {
    if (!shipmentId) return;
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: data.driverId || null,
          vehicleId: data.vehicleId || null,
          dispatcherId: data.dispatcherId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to assign shipment");
        return;
      }
      toast.success("Shipment assignments updated");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Shipment</DialogTitle>
          <DialogDescription>
            {shipment
              ? `Assign dispatcher and driver for ${shipment.trackingNumber}`
              : "Hand off to a dispatcher and/or assign a driver."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dispatcherId">Dispatcher</Label>
            <select id="dispatcherId" className={selectClass} {...register("dispatcherId")}>
              <option value="">Unassigned</option>
              {dispatchers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="driverId">Driver</Label>
            <select id="driverId" className={selectClass} {...register("driverId")}>
              <option value="">Unassigned</option>
              {drivers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.firstName} {d.user.lastName} ({d.licenseNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <select id="vehicleId" className={selectClass} {...register("vehicleId")}>
              <option value="">Unassigned</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} · {v.type.replace(/_/g, " ")} ({v.status.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !shipment}>
              {isSubmitting ? "Saving..." : "Save Assignments"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
