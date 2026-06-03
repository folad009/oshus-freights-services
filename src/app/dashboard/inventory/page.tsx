"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/enums";

export default function InventoryPage() {
  const { data: session } = useSession();
  const isWarehouseStaff = session?.user?.role === UserRole.WAREHOUSE_STAFF;

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          {isWarehouseStaff
            ? "Stock levels for your assigned warehouse branch(es) only"
            : "Track stock levels across warehouse branches"}
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Inventory Items</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No inventory items</TableCell></TableRow>
                ) : data.map((item: { id: string; sku: string; productName: string; category: string; warehouse: { name: string; code: string }; quantity: number; unitCost: number; reorderLevel: number }) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.category.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{item.warehouse?.code}</span>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
