"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { VehicleFormDialog } from "@/components/forms/vehicle-form-dialog";
import { VehicleViewDialog } from "@/components/forms/vehicle-view-dialog";
import { hasPermission } from "@/lib/rbac";
import { getVehicleStatusLabel, getVehicleTypeLabel } from "@/lib/fleet";
import { UserRole } from "@/types/enums";

interface VehicleRow {
  id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  status: string;
  drivers: unknown[];
  _count: { shipments: number };
}

export default function FleetPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const isWarehouseStaff = role === UserRole.WAREHOUSE_STAFF;
  const canWrite = role ? hasPermission(role, "fleet:write") : false;

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as VehicleRow[];
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  function statusBadgeVariant(status: string) {
    if (status === "AVAILABLE") return "secondary" as const;
    if (status === "IN_USE") return "default" as const;
    if (status === "MAINTENANCE") return "outline" as const;
    return "destructive" as const;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-base text-muted-foreground">
            {isWarehouseStaff
              ? "Manage vehicles and monitor driver assignments for your branch"
              : "Monitor and manage vehicles and driver assignments"}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditId(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            Add Vehicle
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Drivers</TableHead>
                  <TableHead>Active Shipments</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono font-medium">{vehicle.plateNumber}</TableCell>
                      <TableCell>{getVehicleTypeLabel(vehicle.type)}</TableCell>
                      <TableCell>{vehicle.capacity} kg</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(vehicle.status)}>
                          {getVehicleStatusLabel(vehicle.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{vehicle.drivers?.length ?? 0}</TableCell>
                      <TableCell>{vehicle._count.shipments}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setViewId(vehicle.id);
                              setViewOpen(true);
                            }}
                          >
                            <Eye />
                          </Button>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditId(vehicle.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicleId={editId}
        onSuccess={handleSuccess}
      />

      <VehicleViewDialog open={viewOpen} onOpenChange={setViewOpen} vehicleId={viewId} />
    </div>
  );
}
