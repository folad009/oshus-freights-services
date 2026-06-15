import {
  getXPrinterPaperConfig,
  wrapThermalText,
  type XPrinterPaperConfig,
} from "@/lib/xprinter-paper";

export type InvoicePrintData = {
  invoiceNumber: string;
  serviceType: string;
  status: string;
  createdAt: string;
  dueDate: string;
  customerName: string;
  trackingNumber?: string;
  weight?: number;
};

function appendText(chunks: number[], text: string) {
  const encoded = new TextEncoder().encode(text);
  chunks.push(...encoded, 0x0a);
}

function appendWrappedText(chunks: number[], text: string, paper: XPrinterPaperConfig) {
  for (const line of wrapThermalText(text, paper.charsPerLine)) {
    appendText(chunks, line);
  }
}

function appendInit(chunks: number[], paper: XPrinterPaperConfig) {
  const push = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  push(0x1b, 0x40);
  push(0x1d, 0x57, paper.printWidthDots & 0xff, (paper.printWidthDots >> 8) & 0xff);
}

function appendSeparator(chunks: number[], paper: XPrinterPaperConfig) {
  appendText(chunks, paper.separator);
}

function appendCode128Barcode(chunks: number[], text: string) {
  const push = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  push(0x1d, 0x68, 80);
  push(0x1d, 0x77, 2);
  push(0x1d, 0x48, 2);

  const payload = `{B${text.toUpperCase()}`;
  const data = new TextEncoder().encode(payload);
  push(0x1d, 0x6b, 73, data.length);
  chunks.push(...data);
}

export function buildInvoiceEscPos(
  data: InvoicePrintData,
  paper: XPrinterPaperConfig = getXPrinterPaperConfig()
): Uint8Array {
  const chunks: number[] = [];

  const push = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  appendInit(chunks, paper);
  push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01);
  appendText(chunks, "Oshus Freights");
  push(0x1b, 0x45, 0x00);
  appendText(chunks, "Waybill");
  appendText(chunks, data.invoiceNumber);
  push(0x1b, 0x61, 0x00);
  appendSeparator(chunks, paper);
  appendWrappedText(chunks, `Customer: ${data.customerName}`, paper);
  appendWrappedText(chunks, `Service: ${data.serviceType}`, paper);
  if (data.trackingNumber) {
    push(0x1b, 0x61, 0x01);
    appendCode128Barcode(chunks, data.trackingNumber);
    appendText(chunks, "");
    push(0x1b, 0x61, 0x00);
    appendWrappedText(chunks, `Shipment: ${data.trackingNumber}`, paper);
  }
  if (data.weight != null) {
    appendText(chunks, `Weight: ${data.weight} kg`);
  }
  appendText(chunks, `Created: ${data.createdAt}`);
  appendText(chunks, `Due: ${data.dueDate}`);
  appendText(chunks, `Status: ${data.status.replace(/_/g, " ")}`);
  appendSeparator(chunks, paper);
  appendText(chunks, "");
  push(0x1d, 0x56, 0x00);

  return new Uint8Array(chunks);
}

export type ShipmentManifestPrintData = {
  trackingNumber: string;
  shipmentType: string;
  status: string;
  origin: string;
  destination: string;
  weight: number;
  packageCount: number;
  cbm: string;
  dimensions: string | null;
  customerName: string;
  contactPerson: string;
  phone: string;
  warehouseCode: string | null;
  createdAt: string;
};

export function buildManifestEscPos(
  data: ShipmentManifestPrintData,
  paper: XPrinterPaperConfig = getXPrinterPaperConfig()
): Uint8Array {
  const chunks: number[] = [];

  const push = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  appendInit(chunks, paper);
  push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01);
  appendText(chunks, "OSHUS FREIGHT");
  push(0x1b, 0x45, 0x00);
  appendText(chunks, "PACKAGE MANIFEST");
  push(0x1b, 0x61, 0x00);
  appendSeparator(chunks, paper);

  appendCode128Barcode(chunks, data.trackingNumber);
  appendText(chunks, "");

  push(0x1b, 0x61, 0x01);
  push(0x1d, 0x21, 0x11);
  appendWrappedText(chunks, data.trackingNumber, paper);
  push(0x1d, 0x21, 0x00);
  push(0x1b, 0x61, 0x00);

  appendSeparator(chunks, paper);
  appendWrappedText(chunks, `FROM: ${data.origin}`, paper);
  appendWrappedText(chunks, `TO:   ${data.destination}`, paper);
  appendSeparator(chunks, paper);
  appendWrappedText(chunks, `Customer: ${data.customerName}`, paper);
  appendWrappedText(chunks, `Contact:  ${data.contactPerson}`, paper);
  appendWrappedText(chunks, `Phone:    ${data.phone}`, paper);
  appendText(chunks, `Type:     ${data.shipmentType}`);
  appendText(chunks, `Status:   ${data.status}`);
  appendText(chunks, `Packages: ${data.packageCount}`);
  appendText(chunks, `Weight:   ${data.weight} kg`);
  appendText(chunks, `CBM:      ${data.cbm}`);
  if (data.dimensions) {
    appendWrappedText(chunks, `Size:     ${data.dimensions}`, paper);
  }
  if (data.warehouseCode) {
    appendText(chunks, `Branch:   ${data.warehouseCode}`);
  }
  appendText(chunks, `Created:  ${data.createdAt}`);
  appendSeparator(chunks, paper);
  appendText(chunks, "Handle with care");
  appendText(chunks, "");
  push(0x1d, 0x56, 0x00);

  return new Uint8Array(chunks);
}

export function invoiceDetailsToPrintData(invoice: {
  invoiceNumber: string;
  serviceType: string;
  status: string;
  createdAt: string;
  dueDate: string;
  customer: { companyName: string };
  shipment: { trackingNumber: string; weight: number } | null;
  createdAtFormatted?: string;
  dueDateFormatted?: string;
}): InvoicePrintData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    serviceType: invoice.serviceType,
    status: invoice.status,
    createdAt: invoice.createdAtFormatted ?? invoice.createdAt,
    dueDate: invoice.dueDateFormatted ?? invoice.dueDate,
    customerName: invoice.customer.companyName,
    trackingNumber: invoice.shipment?.trackingNumber,
    weight: invoice.shipment?.weight,
  };
}
