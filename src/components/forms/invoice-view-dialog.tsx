"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, getInvoiceBalance, canPayInvoice } from "@/lib/helpers";

interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onEdit?: (id: string) => void;
  onPay?: (id: string) => void;
  canEdit?: boolean;
  canPay?: boolean;
}

async function fetchInvoice(id: string) {
  const res = await fetch(`/api/invoices/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as {
    id: string;
    invoiceNumber: string;
    serviceType: string;
    amount: number;
    tax: number;
    totalAmount: number;
    dueDate: string;
    status: string;
    createdAt: string;
    customer: { companyName: string };
    shipment: { id: string; trackingNumber: string } | null;
    payments: Array<{ amount: number; paymentMethod: string; paymentDate: string }>;
  };
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function InvoiceViewDialog({
  open,
  onOpenChange,
  invoiceId,
  onEdit,
  onPay,
  canEdit,
  canPay,
}: InvoiceViewDialogProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice(invoiceId!),
    enabled: open && !!invoiceId,
  });

  const paidTotal = invoice?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const balance = invoice ? getInvoiceBalance(invoice) : 0;
  const showPay = canPay && invoice && canPayInvoice(invoice.status) && balance > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>
            {invoice ? invoice.invoiceNumber : "Loading invoice..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !invoice ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>
              <StatusBadge status={invoice.status} type="invoice" />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <DetailRow label="Customer" value={invoice.customer.companyName} />
              <DetailRow label="Service" value={invoice.serviceType} />
              {invoice.shipment && (
                <DetailRow
                  label="Shipment"
                  value={
                    <Link
                      href={`/track?number=${invoice.shipment.trackingNumber}`}
                      className="font-mono text-brand-blue hover:underline"
                    >
                      {invoice.shipment.trackingNumber}
                    </Link>
                  }
                />
              )}
              <DetailRow label="Created" value={formatDate(invoice.createdAt)} />
              <DetailRow label="Due Date" value={formatDate(invoice.dueDate)} />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <DetailRow label="Subtotal" value={formatCurrency(invoice.amount)} />
              <DetailRow label="Tax" value={formatCurrency(invoice.tax)} />
              <DetailRow label="Total" value={formatCurrency(invoice.totalAmount)} />
              <DetailRow label="Paid" value={formatCurrency(paidTotal)} />
              <DetailRow
                label="Balance"
                value={
                  <span className={balance > 0 ? "text-destructive" : "text-green-600"}>
                    {formatCurrency(balance)}
                  </span>
                }
              />
            </div>

            {invoice.payments.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Payments</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {invoice.payments.map((payment, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border px-2.5 py-1.5"
                    >
                      <span className="text-muted-foreground">
                        {payment.paymentMethod.replace(/_/g, " ")}
                      </span>
                      <span>
                        {formatCurrency(payment.amount)} · {formatDate(payment.paymentDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {showPay && invoiceId && onPay && (
            <Button
              type="button"
              className="bg-brand-blue text-brand-navy hover:bg-brand-blue/90"
              onClick={() => {
                onOpenChange(false);
                onPay(invoiceId);
              }}
            >
              <CreditCard />
              Pay {formatCurrency(balance)}
            </Button>
          )}
          {canEdit && invoiceId && onEdit && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(invoiceId);
              }}
            >
              Edit Invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
