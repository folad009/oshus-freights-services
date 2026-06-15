"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { cn } from "@/lib/utils";
import { normalizeShipmentBarcode } from "@/lib/barcode";

type ShipmentBarcodeProps = {
  value: string;
  className?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
};

export function ShipmentBarcode({
  value,
  className,
  height = 52,
  width = 1.6,
  fontSize = 12,
  displayValue = true,
}: ShipmentBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    JsBarcode(svgRef.current, normalizeShipmentBarcode(value), {
      format: "CODE128",
      displayValue,
      fontSize,
      height,
      width,
      margin: 4,
      textAlign: "center",
      textMargin: 2,
    });
  }, [value, displayValue, fontSize, height, width]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`Shipment barcode ${normalizeShipmentBarcode(value)}`}
      className={cn("mx-auto max-w-full", className)}
    />
  );
}
