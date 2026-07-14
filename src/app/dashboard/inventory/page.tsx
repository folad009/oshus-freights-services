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
import { InventoryFormDialog } from "@/components/forms/inventory-form-dialog";
import { InventoryViewDialog } from "@/components/forms/inventory-view-dialog";
import { hasPermission } from "@/lib/rbac";
import { getInventoryCategoryLabel } from "@/lib/inventory";
import { UserRole } from "@/types/enums";

interface InventoryRow {
  id: string;
  sku: string;
  productName: string;
  category: string;
  warehouse: { name: string; code: string };
  quantity: number;
  unitCost: number;
  reorderLevel: number;
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const isWarehouseStaff = role === UserRole.WAREHOUSE_STAFF;
  const canWrite = role ? hasPermission(role, "inventory:write") : false;

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as InventoryRow[];
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-base text-muted-foreground">
            {isWarehouseStaff
              ? "Manage stock levels for your assigned warehouse branch(es)"
              : "Track and manage stock levels across warehouse branches"}
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
            Add Item
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{getInventoryCategoryLabel(item.category)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.warehouse?.code}
                        </span>
                        <span className="mx-1">·</span>
                        {item.warehouse?.name}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell>
                        {item.quantity <= item.reorderLevel ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setViewId(item.id);
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
                                setEditId(item.id);
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

      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        inventoryId={editId}
        onSuccess={handleSuccess}
      />

      <InventoryViewDialog open={viewOpen} onOpenChange={setViewOpen} inventoryId={viewId} />
    </div>
  );
}
