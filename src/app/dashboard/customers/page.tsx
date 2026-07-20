"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerFormDialog } from "@/components/forms/customer-form-dialog";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

interface CustomerRow {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  user: { email: string };
  _count: { shipments: number };
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const canWrite = role ? hasPermission(role, "customers:write") : false;

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as CustomerRow[];
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function handleDelete(customer: CustomerRow) {
    if ((customer._count?.shipments ?? 0) > 0) {
      toast.error("Cannot delete a customer with existing shipments");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${customer.companyName}? This will permanently remove their account and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete customer");
        return;
      }
      toast.success("Customer deleted");
      handleSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage customer accounts and profiles</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditId(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            New Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shipments</TableHead>
                  {canWrite && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.companyName}</TableCell>
                      <TableCell>{customer.contactPerson}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.user?.email ?? "—"}</TableCell>
                      <TableCell>{customer._count?.shipments ?? 0}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditId(customer.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={
                                (customer._count?.shipments ?? 0) > 0 || deletingId === customer.id
                              }
                              title={
                                (customer._count?.shipments ?? 0) > 0
                                  ? "Cannot delete a customer with shipments"
                                  : "Delete customer"
                              }
                              onClick={() => handleDelete(customer)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={editId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
