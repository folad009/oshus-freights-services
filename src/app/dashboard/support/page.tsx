"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/helpers";

export default function SupportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["support"],
    queryFn: async () => {
      const res = await fetch("/api/support");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">Manage customer support requests</p>
      </div>
      <Card>
        <CardHeader><CardTitle>All Tickets</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No tickets</TableCell></TableRow>
                ) : data.map((t: { id: string; subject: string; customer: { companyName: string }; category: string; status: string; assignee: { firstName: string; lastName: string } | null; createdAt: string }) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell>{t.customer?.companyName}</TableCell>
                    <TableCell>{t.category.replace(/_/g, " ")}</TableCell>
                    <TableCell><Badge variant="secondary">{t.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned"}</TableCell>
                    <TableCell>{formatDate(t.createdAt)}</TableCell>
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
