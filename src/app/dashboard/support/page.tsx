"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SupportTicketFormDialog } from "@/components/forms/support-ticket-form-dialog";
import { formatDate } from "@/lib/helpers";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

export default function SupportPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const role = session?.user?.role as UserRole | undefined;
  const canWrite = role ? hasPermission(role, "support:write") : false;

  const { data, isLoading } = useQuery({
    queryKey: ["support"],
    queryFn: async () => {
      const res = await fetch("/api/support");
      const json = await res.json();
      return json.data;
    },
  });

  async function handleSuccess() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["support"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        {canWrite && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            New Ticket
          </Button>
        )}
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

      <SupportTicketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
