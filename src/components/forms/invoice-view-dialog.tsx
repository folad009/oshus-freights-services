"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { formatDate } from "@/lib/helpers";
import { ShipmentBarcode } from "@/components/shipment-barcode";

interface InvoiceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onEdit?: (id: string) => void;
  canEdit?: boolean;
}

type InvoiceDetails = {
  id: string;
  invoiceNumber: string;
  serviceType: string;
  dueDate: string;
  status: string;
  createdAt: string;
  customer: { companyName: string };
  shipment: { id: string; trackingNumber: string; weight: number } | null;
};

async function fetchInvoice(id: string) {
  const res = await fetch(`/api/invoices/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as InvoiceDetails;
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
  canEdit,
}: InvoiceViewDialogProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoice(invoiceId!),
    enabled: open && !!invoiceId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center font-bold text-2xl">Waybill</DialogTitle>
          {/*<DialogDescription>
            {invoice ? invoice.invoiceNumber : "Loading invoice..."}
          </DialogDescription>*/}
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
                <>
                  <DetailRow
                    label="Shipment"
                    value={
                      <Link
                        href={`/track?number=${invoice.shipment.trackingNumber}`}
                        className="font-bold hover:underline"
                      >
                        {invoice.shipment.trackingNumber}
                      </Link>
                    }
                  />
                  <DetailRow label="Weight" value={`${invoice.shipment.weight} kg`} />
                  <div className="rounded-md border bg-white px-3 py-2">
                    <ShipmentBarcode value={invoice.shipment.trackingNumber} />
                  </div>
                </>
              )}
              {/*<DetailRow label="Created" value={formatDate(invoice.createdAt)} />
              <DetailRow label="Due Date" value={formatDate(invoice.dueDate)} />*/}
            </div>
          </div>
        )}

        {canEdit && invoiceId && onEdit && (
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(invoiceId);
              }}
            >
              Edit Invoice
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
