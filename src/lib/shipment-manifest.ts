import { formatCbm, formatDate } from "@/lib/helpers";

export type ShipmentManifestData = {
  id: string;
  trackingNumber: string;
  shipmentType: string;
  status: string;
  origin: string;
  destination: string;
  weight: number;
  packageCount: number;
  cbm: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  createdAt: string;
  notes: string | null;
  customer: {
    companyName: string;
    contactPerson: string;
    phone: string;
  };
  warehouse: {
    code: string;
    name: string;
  } | null;
};

export function shipmentToManifestData(shipment: {
  id: string;
  trackingNumber: string;
  shipmentType: string;
  status: string;
  origin: string;
  destination: string;
  weight: number;
  packageCount?: number | null;
  cbm?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  createdAt: Date | string;
  notes?: string | null;
  customer: {
    companyName: string;
    contactPerson?: string;
    phone?: string;
  };
  warehouse?: { code: string; name: string } | null;
}): ShipmentManifestData {
  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    shipmentType: shipment.shipmentType.replace(/_/g, " "),
    status: shipment.status.replace(/_/g, " "),
    origin: shipment.origin,
    destination: shipment.destination,
    weight: shipment.weight,
    packageCount: shipment.packageCount ?? 1,
    cbm: shipment.cbm ?? null,
    lengthCm: shipment.lengthCm ?? null,
    widthCm: shipment.widthCm ?? null,
    heightCm: shipment.heightCm ?? null,
    createdAt: formatDate(shipment.createdAt),
    notes: shipment.notes ?? null,
    customer: {
      companyName: shipment.customer.companyName,
      contactPerson: shipment.customer.contactPerson ?? "—",
      phone: shipment.customer.phone ?? "—",
    },
    warehouse: shipment.warehouse ?? null,
  };
}

export function formatManifestDimensions(manifest: ShipmentManifestData) {
  if (!manifest.lengthCm || !manifest.widthCm || !manifest.heightCm) return null;
  return `${manifest.lengthCm} × ${manifest.widthCm} × ${manifest.heightCm} cm`;
}

export function getTrackUrl(trackingNumber: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/track?number=${encodeURIComponent(trackingNumber)}`;
}

export function manifestSummaryLine(manifest: ShipmentManifestData) {
  const parts = [`${manifest.weight} kg`, formatCbm(manifest.cbm)];
  if (manifest.packageCount > 1) {
    parts.push(`${manifest.packageCount} pkgs`);
  }
  return parts.join(" · ");
}

export function manifestToPrintData(manifest: ShipmentManifestData) {
  return {
    trackingNumber: manifest.trackingNumber,
    shipmentType: manifest.shipmentType,
    status: manifest.status,
    origin: manifest.origin,
    destination: manifest.destination,
    weight: manifest.weight,
    packageCount: manifest.packageCount,
    cbm: formatCbm(manifest.cbm),
    dimensions: formatManifestDimensions(manifest),
    customerName: manifest.customer.companyName,
    contactPerson: manifest.customer.contactPerson,
    phone: manifest.customer.phone,
    warehouseCode: manifest.warehouse?.code ?? null,
    createdAt: manifest.createdAt,
  };
}
