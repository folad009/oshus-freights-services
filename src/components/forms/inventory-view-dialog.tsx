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
import { formatDate } from "@/lib/helpers";
import {
  formatInventoryOperation,
  getInventoryCategoryLabel,
} from "@/lib/inventory";

interface InventoryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string | null;
}

type InventoryDetails = {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unitCost: number;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
  warehouse: { id: string; code: string; name: string };
  bin: { code: string; name: string } | null;
  movements: Array<{
    id: string;
    operation: string;
    quantity: number;
    notes: string | null;
    createdAt: string;
  }>;
};

async function fetchInventoryItem(id: string) {
  const res = await fetch(`/api/inventory/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as InventoryDetails;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right sm:max-w-[60%]">{value}</span>
    </div>
  );
}

export function InventoryViewDialog({
  open,
  onOpenChange,
  inventoryId,
}: InventoryViewDialogProps) {
  const { data: item, isLoading } = useQuery({
    queryKey: ["inventory-view", inventoryId],
    queryFn: () => fetchInventoryItem(inventoryId!),
    enabled: open && !!inventoryId,
  });

  const isLowStock = item ? item.quantity <= item.reorderLevel : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Item</DialogTitle>
          <DialogDescription>Stock details and recent movement history.</DialogDescription>
        </DialogHeader>

        {isLoading || !item ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="font-mono text-sm text-muted-foreground">{item.sku}</p>
                </div>
                {isLowStock ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : (
                  <Badge variant="secondary">In Stock</Badge>
                )}
              </div>

              <div className="space-y-2">
                <DetailRow label="Category" value={getInventoryCategoryLabel(item.category)} />
                <DetailRow
                  label="Branch"
                  value={`${item.warehouse.code} · ${item.warehouse.name}`}
                />
                {item.bin && (
                  <DetailRow label="Bin" value={`${item.bin.code} · ${item.bin.name}`} />
                )}
                <DetailRow label="Quantity" value={item.quantity} />
                <DetailRow label="Unit Cost" value={`$${item.unitCost.toFixed(2)}`} />
                <DetailRow label="Reorder Level" value={item.reorderLevel} />
                <DetailRow label="Stock Value" value={`$${(item.quantity * item.unitCost).toFixed(2)}`} />
                <DetailRow label="Last Updated" value={formatDate(item.updatedAt)} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Movements</p>
              {!item.movements.length ? (
                <p className="text-sm text-muted-foreground">No movement history yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{formatInventoryOperation(movement.operation)}</TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(movement.createdAt)}
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
