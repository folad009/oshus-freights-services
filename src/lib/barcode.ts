/** Barcode payload for shipment labels — encodes the tracking number for office scanners. */
export function normalizeShipmentBarcode(value: string) {
  return value.trim().toUpperCase();
}

export function isValidShipmentBarcode(value: string) {
  const normalized = normalizeShipmentBarcode(value);
  return /^OSH-[A-Z0-9]+-[A-Z0-9]+$/.test(normalized);
}

export function getShipmentScanPath(trackingNumber: string) {
  return `/dashboard/scan?number=${encodeURIComponent(normalizeShipmentBarcode(trackingNumber))}`;
}

export function parseShipmentBarcodeInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes("?")) {
    try {
      const url = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed, "https://oshus.local");
      const fromQuery =
        url.searchParams.get("number") ?? url.searchParams.get("trackingNumber");
      if (fromQuery) return normalizeShipmentBarcode(fromQuery);
    } catch {
      // Fall through to plain tracking number parsing.
    }
  }

  return normalizeShipmentBarcode(trimmed);
}
