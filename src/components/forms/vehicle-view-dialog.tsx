"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getVehicleStatusLabel, getVehicleTypeLabel } from "@/lib/fleet";
import { formatDate, SHIPMENT_STATUS_LABELS } from "@/lib/helpers";

interface VehicleViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
}

type VehicleDetails = {
  id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  status: string;
  fuelUsage: number;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
  drivers: Array<{
    id: string;
    licenseNumber: string;
    status: string;
    user: { firstName: string; lastName: string; email: string };
  }>;
  shipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
  }>;
  _count: { shipments: number; drivers: number };
};

async function fetchVehicle(id: string) {
  const res = await fetch(`/api/vehicles/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as VehicleDetails;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right sm:max-w-[60%]">{value}</span>
    </div>
  );
}

function statusBadgeVariant(status: string) {
  if (status === "AVAILABLE") return "secondary" as const;
  if (status === "IN_USE") return "default" as const;
  if (status === "MAINTENANCE") return "outline" as const;
  return "destructive" as const;
}

export function VehicleViewDialog({ open, onOpenChange, vehicleId }: VehicleViewDialogProps) {
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle-view", vehicleId],
    queryFn: () => fetchVehicle(vehicleId!),
    enabled: open && !!vehicleId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vehicle Details</DialogTitle>
          <DialogDescription>Fleet vehicle information, drivers, and active shipments.</DialogDescription>
        </DialogHeader>

        {isLoading || !vehicle ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-semibold">{vehicle.plateNumber}</p>
                  <p className="text-sm text-muted-foreground">{getVehicleTypeLabel(vehicle.type)}</p>
                </div>
                <Badge variant={statusBadgeVariant(vehicle.status)}>
                  {getVehicleStatusLabel(vehicle.status)}
                </Badge>
              </div>

              <div className="space-y-2">
                <DetailRow label="Capacity" value={`${vehicle.capacity} kg`} />
                <DetailRow label="Fuel Usage" value={`${vehicle.fuelUsage.toFixed(1)} L`} />
                <DetailRow
                  label="Last Maintenance"
                  value={vehicle.lastMaintenance ? formatDate(vehicle.lastMaintenance) : "—"}
                />
                <DetailRow
                  label="Next Maintenance"
                  value={vehicle.nextMaintenance ? formatDate(vehicle.nextMaintenance) : "—"}
                />
                <DetailRow label="Assigned Drivers" value={vehicle._count.drivers} />
                <DetailRow label="Total Shipments" value={vehicle._count.shipments} />
                <DetailRow label="Last Updated" value={formatDate(vehicle.updatedAt)} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Assigned Drivers</p>
              {!vehicle.drivers.length ? (
                <p className="text-sm text-muted-foreground">No drivers assigned.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>License</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell>
                          {driver.user.firstName} {driver.user.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{driver.licenseNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Active Shipments</p>
              {!vehicle.shipments.length ? (
                <p className="text-sm text-muted-foreground">No active shipments.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicle.shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-sm">{shipment.trackingNumber}</TableCell>
                        <TableCell className="text-sm">
                          {shipment.origin} → {shipment.destination}
                        </TableCell>
                        <TableCell>
                          {SHIPMENT_STATUS_LABELS[shipment.status as keyof typeof SHIPMENT_STATUS_LABELS] ??
                            shipment.status.replace(/_/g, " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
