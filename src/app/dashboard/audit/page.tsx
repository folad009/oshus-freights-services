"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/helpers";

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await fetch("/api/audit");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Track system activity and changes</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No audit logs</TableCell></TableRow>
                ) : data.map((log: { id: string; user: { firstName: string; lastName: string } | null; action: string; entity: string; entityId: string; details: string | null; createdAt: string }) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</TableCell>
                    <TableCell><Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.details ?? log.entityId}</TableCell>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
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
