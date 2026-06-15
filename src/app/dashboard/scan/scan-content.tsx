"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScanBarcode, Package, MapPin, User, Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ShipmentBarcode } from "@/components/shipment-barcode";
import { formatDate } from "@/lib/helpers";
import {
  isValidShipmentBarcode,
  normalizeShipmentBarcode,
  parseShipmentBarcodeInput,
} from "@/lib/barcode";
import { cn } from "@/lib/utils";

type ScannedShipment = {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  shipmentType: string;
  weight: number;
  packageCount: number;
  createdAt: string;
  customer: {
    companyName: string;
    contactPerson: string;
    phone: string;
  };
  warehouse: { id: string; code: string; name: string } | null;
  driver: {
    user: { firstName: string; lastName: string };
  } | null;
  dispatcher: { firstName: string; lastName: string } | null;
  events: Array<{
    eventType: string;
    location: string;
    timestamp: string;
    notes: string | null;
  }>;
};

async function lookupShipment(trackingNumber: string) {
  const normalized = normalizeShipmentBarcode(trackingNumber);
  const res = await fetch(
    `/api/shipments/lookup?trackingNumber=${encodeURIComponent(normalized)}`
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Shipment not found");
  return json.data as ScannedShipment;
}

export default function ScanPageContent() {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScannedParamRef = useRef<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [shipment, setShipment] = useState<ScannedShipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleScan = useCallback(
    async (rawValue: string) => {
      const value = parseShipmentBarcodeInput(rawValue);
      if (!value) return;

      setLoading(true);
      setError("");
      setShipment(null);

      try {
        if (!isValidShipmentBarcode(value)) {
          throw new Error("Invalid barcode format. Expected a tracking number like OSH-XXXXXX-XXXX.");
        }

        const result = await lookupShipment(value);
        setShipment(result);
        setScanCount((count) => count + 1);
        setScanValue("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lookup failed");
        setScanValue("");
      } finally {
        setLoading(false);
        focusInput();
      }
    },
    [focusInput]
  );

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    const numberParam = searchParams.get("number") ?? searchParams.get("trackingNumber");
    if (!numberParam || numberParam === lastScannedParamRef.current) return;

    lastScannedParamRef.current = numberParam;
    void handleScan(numberParam);
  }, [handleScan, searchParams]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void handleScan(scanValue);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScanBarcode className="size-7" />
          Scan & Track
        </h1>
        <p className="text-muted-foreground">
          Scan a shipment barcode from anywhere in the dashboard to open this page, or scan directly
          here to look up a package.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Barcode Scanner</CardTitle>
          <CardDescription>
            Point the scanner at the label barcode, or type a tracking number and press Enter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              ref={inputRef}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Scan barcode or enter tracking number..."
              autoComplete="off"
              autoFocus
              disabled={loading}
              className="font-mono text-lg"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {scanCount > 0 ? `${scanCount} scan${scanCount === 1 ? "" : "s"} this session` : "Ready to scan"}
              </span>
              <Button type="submit" disabled={loading || !scanValue.trim()}>
                {loading ? "Looking up..." : "Lookup"}
              </Button>
            </div>
          </form>

          {error && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {shipment && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-mono">{shipment.trackingNumber}</CardTitle>
                <CardDescription>Shipment summary</CardDescription>
              </div>
              <StatusBadge status={shipment.status} type="shipment" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ShipmentBarcode value={shipment.trackingNumber} className="w-full" />

            <div className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Route</p>
                  <p className="text-muted-foreground">
                    {shipment.origin} → {shipment.destination}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{shipment.customer.companyName}</p>
                  <p className="text-muted-foreground">
                    {shipment.customer.contactPerson} · {shipment.customer.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Package</p>
                  <p className="text-muted-foreground">
                    {shipment.shipmentType} · {shipment.packageCount} pkg · {shipment.weight} kg
                  </p>
                </div>
              </div>
              {shipment.warehouse && (
                <div className="flex items-start gap-2">
                  <Warehouse className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Branch</p>
                    <p className="text-muted-foreground">
                      {shipment.warehouse.code} · {shipment.warehouse.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {shipment.events.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">Recent activity</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {shipment.events.map((event, index) => (
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

            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/shipments" className={cn(buttonVariants({ variant: "outline" }))}>
                All Shipments
              </Link>
              <Link
                href={`/track?number=${shipment.trackingNumber}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Public Track Page
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ScanPageFallback() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
