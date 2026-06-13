"use client";

import {
  buildInvoiceEscPos,
  invoiceDetailsToPrintData,
  type InvoicePrintData,
} from "@/lib/escpos";
import { formatDate } from "@/lib/helpers";

const XPRINTER_USB_FILTERS: USBDeviceFilter[] = [
  { classCode: 7 },
  { vendorId: 0x0483 },
  { vendorId: 0x0416 },
  { vendorId: 0x6868 },
  { vendorId: 0x1fc9 },
  { vendorId: 0x1659 },
];

type InvoiceForPrint = {
  id: string;
  invoiceNumber: string;
  serviceType: string;
  status: string;
  createdAt: string;
  dueDate: string;
  customer: { companyName: string };
  shipment: { trackingNumber: string; weight: number } | null;
};

type PrintMethod = "usb" | "network";

function toPrintData(invoice: InvoiceForPrint): InvoicePrintData {
  return invoiceDetailsToPrintData({
    ...invoice,
    createdAtFormatted: formatDate(invoice.createdAt),
    dueDateFormatted: formatDate(invoice.dueDate),
  });
}

function isXPrinterDevice(device: USBDevice) {
  const name = `${device.manufacturerName ?? ""} ${device.productName ?? ""}`.toLowerCase();
  return name.includes("xprinter") || name.includes("xp-") || name.includes("thermal");
}

async function findAuthorizedPrinter() {
  if (!navigator.usb) return null;

  const devices = await navigator.usb.getDevices();
  return devices.find(isXPrinterDevice) ?? devices[0] ?? null;
}

async function connectPrinter(): Promise<USBDevice> {
  if (!navigator.usb) {
    throw new Error("WebUSB is not supported. Use Chrome or Edge on HTTPS or localhost.");
  }

  const existing = await findAuthorizedPrinter();
  if (existing) return existing;

  return navigator.usb.requestDevice({ filters: XPRINTER_USB_FILTERS });
}

async function sendEscPosToUsb(device: USBDevice, data: Uint8Array) {
  await device.open();

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

  const usbInterface = device.configuration?.interfaces.find((iface) =>
    iface.alternates.some((alternate) =>
      alternate.endpoints.some((endpoint) => endpoint.direction === "out")
    )
  );

  if (!usbInterface) {
    throw new Error("Could not find a printable USB interface on this device.");
  }

  const alternate = usbInterface.alternates.find((item) =>
    item.endpoints.some((endpoint) => endpoint.direction === "out")
  );

  if (!alternate) {
    throw new Error("Could not find a printable USB endpoint on this device.");
  }

  const outEndpoint = alternate.endpoints.find((endpoint) => endpoint.direction === "out");
  if (!outEndpoint) {
    throw new Error("Could not find a USB OUT endpoint on this device.");
  }

  await device.claimInterface(usbInterface.interfaceNumber);
  try {
    await device.transferOut(outEndpoint.endpointNumber, new Uint8Array(data));
  } finally {
    await device.releaseInterface(usbInterface.interfaceNumber);
    await device.close();
  }
}

export async function printInvoiceViaWebUsb(invoice: InvoiceForPrint) {
  const device = await connectPrinter();
  const payload = buildInvoiceEscPos(toPrintData(invoice));
  await sendEscPosToUsb(device, payload);
}

async function printInvoiceViaNetwork(invoice: InvoiceForPrint) {
  const response = await fetch("/api/print/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId: invoice.id }),
  });

  const json = (await response.json()) as {
    success: boolean;
    data?: {
      printed: boolean;
      method: PrintMethod | null;
      code?: string;
      message?: string;
    };
    message?: string;
  };

  if (json.success && json.data?.printed) {
    return { method: "network" as const };
  }

  const code = json.data?.code;
  const message = json.data?.message ?? json.message;

  if (code === "PRINTER_NOT_CONFIGURED" || code === "NETWORK_PRINT_FAILED") {
    return {
      method: null,
      code: code as "PRINTER_NOT_CONFIGURED" | "NETWORK_PRINT_FAILED",
      message,
    };
  }

  throw new Error(message ?? "Could not send the job to the network XPrinter.");
}

export async function printInvoiceToXPrinter(invoice: InvoiceForPrint) {
  const authorizedUsb = await findAuthorizedPrinter();
  if (authorizedUsb) {
    await printInvoiceViaWebUsb(invoice);
    return { method: "usb" as const };
  }

  const networkResult = await printInvoiceViaNetwork(invoice);
  if (networkResult.method === "network") {
    return { method: "network" as const };
  }

  if (navigator.usb) {
    await printInvoiceViaWebUsb(invoice);
    return { method: "usb" as const };
  }

  throw new Error(
    networkResult.message ??
      "Could not print to XPrinter. For USB printers use Chrome/Edge. For network printers set XPRINTER_HOST to the printer IP."
  );
}
