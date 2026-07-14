"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ShipmentBarcode } from "@/components/shipment-barcode";
import { formatCurrency, formatDate, formatCbm } from "@/lib/helpers";
import { getShipmentTypeLabel } from "@/lib/shipment-types";
import { getGovernmentIdTypeLabel, maskIdDocumentNumber } from "@/lib/id-document";

interface ShipmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string | null;
}

type ShipmentDetails = {
  id: string;
  trackingNumber: string;
  shipmentType: string;
  status: string;
  origin: string;
  destination: string;
  weight: number;
  cbm: number | null;
  packageCount: number;
  requestPickup: boolean;
  requestDelivery: boolean;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  pickupServiceCost: number | null;
  deliveryServiceCost: number | null;
  hasInsurance: boolean;
  declaredValue: number | null;
  insuranceCost: number | null;
  scheduledPickup: string | null;
  estimatedDelivery: string | null;
  notes: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
  idDocumentOriginalName: string | null;
  idDocumentUploadedAt: string | null;
  createdAt: string;
  invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; status: string }>;
  events: Array<{ eventType: string; location: string; timestamp: string; notes: string | null }>;
};

async function fetchShipment(id: string) {
  const res = await fetch(`/api/shipments/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as ShipmentDetails;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right sm:max-w-[60%]">{value}</span>
    </div>
  );
}

export function ShipmentViewDialog({ open, onOpenChange, shipmentId }: ShipmentViewDialogProps) {
  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment-view", shipmentId],
    queryFn: () => fetchShipment(shipmentId!),
    enabled: open && !!shipmentId,
  });

  const latestInvoice = shipment?.invoices?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shipment Details</DialogTitle>
          <DialogDescription>
            {shipment ? shipment.trackingNumber : "Loading shipment..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !shipment ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <span className="font-mono font-semibold">{shipment.trackingNumber}</span>
              <StatusBadge status={shipment.status} type="shipment" />
            </div>

            <div className="rounded-md border bg-white px-3 py-2">
              <ShipmentBarcode value={shipment.trackingNumber} />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <DetailRow label="Type" value={getShipmentTypeLabel(shipment.shipmentType as never)} />
              <DetailRow label="Route" value={`${shipment.origin} → ${shipment.destination}`} />
              <DetailRow label="Weight" value={`${shipment.weight} kg`} />
              <DetailRow label="CBM" value={formatCbm(shipment.cbm)} />
              <DetailRow label="Packages" value={shipment.packageCount} />
              {shipment.scheduledPickup && (
                <DetailRow label="Scheduled Pickup" value={formatDate(shipment.scheduledPickup)} />
              )}
              {shipment.estimatedDelivery && (
                <DetailRow label="Est. Delivery" value={formatDate(shipment.estimatedDelivery)} />
              )}
            </div>

            {(shipment.requestPickup || shipment.requestDelivery) && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium">Door Services (billed separately)</p>
                {shipment.requestPickup && (
                  <>
                    <DetailRow label="Pickup" value="Logistics company pickup requested" />
                    {shipment.pickupAddress && (
                      <DetailRow label="Pickup address" value={shipment.pickupAddress} />
                    )}
                    {shipment.pickupServiceCost != null && (
                      <DetailRow label="Pickup fee" value={formatCurrency(shipment.pickupServiceCost)} />
                    )}
                  </>
                )}
                {shipment.requestDelivery && (
                  <>
                    <DetailRow label="Delivery" value="Door delivery at destination requested" />
                    {shipment.deliveryAddress && (
                      <DetailRow label="Delivery address" value={shipment.deliveryAddress} />
                    )}
                    {shipment.deliveryServiceCost != null && (
                      <DetailRow label="Delivery fee" value={formatCurrency(shipment.deliveryServiceCost)} />
                    )}
                  </>
                )}
              </div>
            )}

            {shipment.hasInsurance && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium">Insurance</p>
                <DetailRow
                  label="Declared value"
                  value={shipment.declaredValue != null ? formatCurrency(shipment.declaredValue) : "—"}
                />
                <DetailRow
                  label="Insurance cost"
                  value={shipment.insuranceCost != null ? formatCurrency(shipment.insuranceCost) : "—"}
                />
              </div>
            )}

            {shipment.idDocumentType && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium">Government ID</p>
                <DetailRow
                  label="Document type"
                  value={getGovernmentIdTypeLabel(shipment.idDocumentType)}
                />
                {shipment.idDocumentNumber && (
                  <DetailRow
                    label="ID number"
                    value={maskIdDocumentNumber(
                      shipment.idDocumentType ?? "",
                      shipment.idDocumentNumber
                    )}
                  />
                )}
                {shipment.idDocumentUploadedAt && (
                  <DetailRow label="Uploaded" value={formatDate(shipment.idDocumentUploadedAt)} />
                )}
                <DetailRow
                  label="Document"
                  value={
                    <Link
                      href={`/api/shipments/${shipment.id}/id-document`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {shipment.idDocumentOriginalName ?? "View ID document"}
                    </Link>
                  }
                />
              </div>
            )}

            {latestInvoice && (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <DetailRow label="Invoice" value={latestInvoice.invoiceNumber} />
                <DetailRow label="Invoice total" value={formatCurrency(latestInvoice.totalAmount)} />
                <DetailRow label="Invoice status" value={<StatusBadge status={latestInvoice.status} type="invoice" />} />
              </div>
            )}

            {shipment.notes && <DetailRow label="Notes" value={shipment.notes} />}

            {shipment.events.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">Tracking history</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {shipment.events.slice(0, 5).map((event, index) => (
                    <li key={`${event.timestamp}-${index}`} className="flex justify-between gap-2">
                      <span>
                        {event.eventType.replace(/_/g, " ")} · {event.location}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatDate(event.timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-center text-sm">
              <Link href={`/track?number=${shipment.trackingNumber}`} className="text-primary hover:underline">
                Open public tracking page
              </Link>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
