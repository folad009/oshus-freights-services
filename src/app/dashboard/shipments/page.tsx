"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Eye, Pencil, Printer, UserRound } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import { ShipmentFormDialog } from "@/components/forms/shipment-form-dialog";
import { ShipmentViewDialog } from "@/components/forms/shipment-view-dialog";
import { ShipmentAssignDialog } from "@/components/forms/shipment-assign-dialog";
import { ShipmentManifestDialog } from "@/components/forms/shipment-manifest-dialog";
import { formatDate, formatCbm } from "@/lib/helpers";
import { getShipmentTypeLabel } from "@/lib/shipment-types";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

async function fetchShipments() {
  const res = await fetch("/api/shipments");
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export default function ShipmentsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [manifestId, setManifestId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const isCustomer = role === UserRole.CUSTOMER;
  const isWarehouseStaff = role === UserRole.WAREHOUSE_STAFF;
  const canRead = role ? hasPermission(role, "shipments:read") : false;
  const canWrite = role ? hasPermission(role, "shipments:write") : false;
  const canAssign = role ? hasPermission(role, "shipments:assign") : false;
  const canPrint = canRead && !isCustomer;
  const canEdit = canWrite && !isCustomer;

  const { data, isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: fetchShipments,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("shipmentType") || params.has("lengthCm") || params.has("customerId")) {
      window.history.replaceState(null, "", "/dashboard/shipments");
    }
  }, []);

  function openCreate() {
    setEditId(null);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    setEditId(id);
    setFormOpen(true);
  }

  function openView(id: string) {
    setViewId(id);
    setViewOpen(true);
  }

  function openAssign(id: string) {
    setAssignId(id);
    setAssignOpen(true);
  }

  function openManifest(id: string) {
    setManifestId(id);
    setManifestOpen(true);
  }

  async function handleSuccess(createdShipmentId?: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["shipments"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
    ]);
    await queryClient.refetchQueries({ queryKey: ["shipments"] });

    if (createdShipmentId && !isCustomer) {
      openManifest(createdShipmentId);
    }
  }

  const showActions = isCustomer || canPrint || canEdit || canAssign;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground">
            {isCustomer
              ? "Create shipments and view your booking history"
              : isWarehouseStaff
                ? "Shipments routed through your assigned warehouse branch(es)"
                : "Manage and track all shipments"}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus />
            New Shipment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isCustomer ? "My Shipments" : isWarehouseStaff ? "Branch Shipments" : "All Shipments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  {!isCustomer && <TableHead>Customer</TableHead>}
                  {!isCustomer && <TableHead>Branch</TableHead>}
                  <TableHead>Route</TableHead>
                  {!isCustomer && <TableHead>Dispatcher</TableHead>}
                  {!isCustomer && <TableHead>Driver</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>CBM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {showActions && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={(isCustomer ? 8 : 11) + (showActions ? 1 : 0)}
                      className="text-center text-muted-foreground"
                    >
                      No shipments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(
                    (s: {
                      id: string;
                      trackingNumber: string;
                      customer: { companyName: string };
                      warehouse: { code: string; name: string } | null;
                      driver: { user: { firstName: string; lastName: string } } | null;
                      dispatcher: { firstName: string; lastName: string } | null;
                      origin: string;
                      destination: string;
                      shipmentType: string;
                      weight: number;
                      cbm: number | null;
                      status: string;
                      createdAt: string;
                    }) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono font-medium">{s.trackingNumber}</TableCell>
                        {!isCustomer && (
                          <TableCell>{s.customer?.companyName ?? "—"}</TableCell>
                        )}
                        {!isCustomer && (
                          <TableCell className="text-sm">
                            {s.warehouse ? (
                              <>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {s.warehouse.code}
                                </span>
                                <span className="mx-1">·</span>
                                {s.warehouse.name}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          {s.origin} → {s.destination}
                        </TableCell>
                        {!isCustomer && (
                          <TableCell className="text-sm">
                            {s.dispatcher
                              ? `${s.dispatcher.firstName} ${s.dispatcher.lastName}`
                              : "—"}
                          </TableCell>
                        )}
                        {!isCustomer && (
                          <TableCell className="text-sm">
                            {s.driver
                              ? `${s.driver.user.firstName} ${s.driver.user.lastName}`
                              : "—"}
                          </TableCell>
                        )}
                        <TableCell>{getShipmentTypeLabel(s.shipmentType as never)}</TableCell>
                        <TableCell>{s.weight} kg</TableCell>
                        <TableCell>{formatCbm(s.cbm)}</TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} type="shipment" />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(s.createdAt)}
                        </TableCell>
                        {showActions && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(isCustomer || canRead) && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="View shipment"
                                  onClick={() => openView(s.id)}
                                >
                                  <Eye />
                                </Button>
                              )}
                              {canPrint && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Print package manifest"
                                  onClick={() => openManifest(s.id)}
                                >
                                  <Printer />
                                </Button>
                              )}
                              {canAssign && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Assign dispatcher & driver"
                                  onClick={() => openAssign(s.id)}
                                >
                                  <UserRound />
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Edit shipment"
                                  onClick={() => openEdit(s.id)}
                                >
                                  <Pencil />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ShipmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        shipmentId={isCustomer ? null : editId}
        onSuccess={handleSuccess}
      />

      <ShipmentViewDialog open={viewOpen} onOpenChange={setViewOpen} shipmentId={viewId} />

      {!isCustomer && (
        <>
          <ShipmentManifestDialog
            open={manifestOpen}
            onOpenChange={setManifestOpen}
            shipmentId={manifestId}
          />

          <ShipmentAssignDialog
            open={assignOpen}
            onOpenChange={setAssignOpen}
            shipmentId={assignId}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </div>
  );
}
