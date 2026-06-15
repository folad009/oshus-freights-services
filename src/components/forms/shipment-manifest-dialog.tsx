"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Tag } from "lucide-react";
import { toast } from "sonner";
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
import { ShipmentManifestLabel, printManifestLabel } from "@/components/shipment-manifest-label";
import { printManifestToXPrinter } from "@/lib/xprinter-client";
import { shipmentToManifestData } from "@/lib/shipment-manifest";
import { formatThermalPaperLabel, getClientXPrinterPaperConfig } from "@/lib/xprinter-paper";

interface ShipmentManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string | null;
}

async function fetchShipment(id: string) {
  const res = await fetch(`/api/shipments/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export function ShipmentManifestDialog({
  open,
  onOpenChange,
  shipmentId,
}: ShipmentManifestDialogProps) {
  const [isPrintingLabel, setIsPrintingLabel] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ["shipment", shipmentId, "manifest"],
    queryFn: () => fetchShipment(shipmentId!),
    enabled: open && !!shipmentId,
  });

  const manifest = shipment ? shipmentToManifestData(shipment) : null;
  const paper = getClientXPrinterPaperConfig();

  async function handlePrintLabel() {
    if (!manifest || !shipment) return;

    setIsPrintingLabel(true);
    try {
      printManifestLabel(manifest);
      toast.success("Opening label print dialog");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print label");
    } finally {
      setIsPrintingLabel(false);
    }
  }

  async function handlePrintThermal() {
    if (!shipment) return;

    setIsPrintingThermal(true);
    try {
      const result = await printManifestToXPrinter(shipment);
      toast.success(
        result.method === "usb"
          ? "Manifest sent to USB XPrinter"
          : "Manifest sent to network XPrinter"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print to XPrinter");
    } finally {
      setIsPrintingThermal(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4" />
            Package Manifest
          </DialogTitle>
          <DialogDescription>
            Print a sticker for your XPrinter thermal roll ({formatThermalPaperLabel(paper)}).
            Choose XPrinter for direct thermal output, or Print Label for the browser print dialog.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="mx-auto h-[360px]" style={{ width: paper.previewWidthPx }} />
        ) : error || !manifest ? (
          <p className="text-sm text-destructive">Could not load shipment for printing.</p>
        ) : (
          <div className="flex justify-center overflow-auto rounded-lg border bg-muted/30 p-4">
            <ShipmentManifestLabel manifest={manifest} />
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!manifest || isPrintingThermal}
              onClick={() => void handlePrintThermal()}
            >
              {isPrintingThermal ? "Sending..." : "XPrinter"}
            </Button>
            <Button
              type="button"
              disabled={!manifest || isPrintingLabel}
              onClick={() => void handlePrintLabel()}
            >
              <Printer />
              {isPrintingLabel ? "Printing..." : "Print Label"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}