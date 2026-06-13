"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Eye, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceFormDialog } from "@/components/forms/invoice-form-dialog";
import { InvoiceViewDialog } from "@/components/forms/invoice-view-dialog";
import { InvoicePayDialog } from "@/components/forms/invoice-pay-dialog";
import { formatCurrency, formatDate, getInvoiceBalance, canPayInvoice } from "@/lib/helpers";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const canWrite = role ? hasPermission(role, "invoices:write") : false;
  const isCustomer = role === UserRole.CUSTOMER;

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  function openView(id: string) {
    setViewId(id);
    setViewOpen(true);
  }

  function openEdit(id: string) {
    setEditId(id);
    setFormOpen(true);
  }

  function openPay(id: string) {
    setPayId(id);
    setPayOpen(true);
  }

  function invoiceIsPayable(inv: { status: string; payments: { amount: number }[]; totalAmount: number }) {
    return isCustomer && canPayInvoice(inv.status) && getInvoiceBalance(inv) > 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            {isCustomer ? "View and pay your invoices" : "Manage billing and invoice lifecycle"}
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
            New Invoice
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No invoices
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(
                    (inv: {
                      id: string;
                      invoiceNumber: string;
                      customer: { companyName: string };
                      shipment: { trackingNumber: string } | null;
                      serviceType: string;
                      amount: number;
                      totalAmount: number;
                      dueDate: string;
                      status: string;
                      payments: { amount: number }[];
                    }) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customer?.companyName}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {inv.shipment?.trackingNumber ?? "—"}
                        </TableCell>
                        <TableCell>{inv.serviceType}</TableCell>
                        <TableCell>{formatCurrency(inv.amount)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} type="invoice" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View invoice"
                              onClick={() => openView(inv.id)}
                            >
                              <Eye />
                            </Button>
                            {invoiceIsPayable(inv) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Pay invoice"
                                className="text-brand-blue"
                                onClick={() => openPay(inv.id)}
                              >
                                <CreditCard />
                              </Button>
                            )}
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Edit invoice"
                                onClick={() => openEdit(inv.id)}
                              >
                                <Pencil />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvoiceViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        invoiceId={viewId}
        canEdit={canWrite}
        onEdit={openEdit}
      />

      <InvoicePayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoiceId={payId}
        onSuccess={handleSuccess}
      />

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoiceId={editId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
