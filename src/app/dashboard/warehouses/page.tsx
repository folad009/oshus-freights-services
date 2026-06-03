"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { WarehouseFormDialog } from "@/components/forms/warehouse-form-dialog";
import { WarehouseStaffDialog } from "@/components/forms/warehouse-staff-dialog";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

export default function WarehousesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [staffWarehouseId, setStaffWarehouseId] = useState<string | null>(null);
  const [staffWarehouseName, setStaffWarehouseName] = useState("");

  const role = session?.user?.role as UserRole | undefined;
  const isAdmin = role === UserRole.ADMIN;
  const canWrite = role ? hasPermission(role, "warehouses:write") : false;

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  }

  function openStaff(id: string, name: string) {
    setStaffWarehouseId(id);
    setStaffWarehouseName(name);
    setStaffOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Branches</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Create branches and assign staff — each branch operates independently"
              : "Your assigned warehouse branches"}
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
            New Branch
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? "All Branches" : "My Branches"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground">
                      No warehouse branches
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(
                    (w: {
                      id: string;
                      code: string;
                      name: string;
                      city: string | null;
                      isActive: boolean;
                      manager: { firstName: string; lastName: string } | null;
                      _count: { zones: number; inventory: number; assignments: number };
                    }) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono font-medium">{w.code}</TableCell>
                        <TableCell>{w.name}</TableCell>
                        <TableCell>{w.city ?? "—"}</TableCell>
                        <TableCell>
                          {w.manager ? `${w.manager.firstName} ${w.manager.lastName}` : "—"}
                        </TableCell>
                        <TableCell>{w._count.assignments}</TableCell>
                        <TableCell>{w._count.inventory}</TableCell>
                        <TableCell>
                          <Badge variant={w.isActive ? "secondary" : "outline"}>
                            {w.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Assign staff"
                                onClick={() => openStaff(w.id, w.name)}
                              >
                                <Users />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Edit branch"
                                onClick={() => {
                                  setEditId(w.id);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil />
                              </Button>
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

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouseId={editId}
        onSuccess={handleSuccess}
      />

      <WarehouseStaffDialog
        open={staffOpen}
        onOpenChange={setStaffOpen}
        warehouseId={staffWarehouseId}
        warehouseName={staffWarehouseName}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
