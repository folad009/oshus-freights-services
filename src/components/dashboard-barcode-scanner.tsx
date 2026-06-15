"use client";

import { useDashboardBarcodeScanner } from "@/hooks/use-dashboard-barcode-scanner";

type DashboardBarcodeScannerProps = {
  enabled: boolean;
};

export function DashboardBarcodeScanner({ enabled }: DashboardBarcodeScannerProps) {
  useDashboardBarcodeScanner(enabled);
  return null;
}
