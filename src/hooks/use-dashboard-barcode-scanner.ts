"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getShipmentScanPath,
  isValidShipmentBarcode,
  parseShipmentBarcodeInput,
} from "@/lib/barcode";

const SCAN_RESET_MS = 120;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useDashboardBarcodeScanner(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled || pathname === "/dashboard/scan") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > SCAN_RESET_MS) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        const trackingNumber = parseShipmentBarcodeInput(bufferRef.current);
        bufferRef.current = "";

        if (!trackingNumber || !isValidShipmentBarcode(trackingNumber)) return;

        event.preventDefault();
        router.push(getShipmentScanPath(trackingNumber));
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        bufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, pathname, router]);
}
