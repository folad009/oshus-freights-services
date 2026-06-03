"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function FleetPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
        <p className="text-muted-foreground">Monitor vehicles and driver assignments</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Vehicles</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Drivers</TableHead>
                  <TableHead>Active Shipments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No vehicles</TableCell></TableRow>
                ) : data.map((v: { id: string; plateNumber: string; type: string; capacity: number; status: string; drivers: unknown[]; _count: { shipments: number } }) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">{v.plateNumber}</TableCell>
                    <TableCell>{v.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{v.capacity} kg</TableCell>
                    <TableCell><Badge variant="secondary">{v.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{v.drivers?.length ?? 0}</TableCell>
                    <TableCell>{v._count.shipments}</TableCell>
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
