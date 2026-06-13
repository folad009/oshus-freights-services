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

export function buildInvoiceEscPos(data: InvoicePrintData): Uint8Array {
  const chunks: number[] = [];

  const push = (...bytes: number[]) => {
    chunks.push(...bytes);
  };

  push(0x1b, 0x40);
  push(0x1b, 0x61, 0x01);
  push(0x1b, 0x45, 0x01);
  appendText(chunks, "Oshus Freights");
  push(0x1b, 0x45, 0x00);
  appendText(chunks, `Invoice ${data.invoiceNumber}`);
  push(0x1b, 0x61, 0x00);
  appendText(chunks, "--------------------------------");
  appendText(chunks, `Customer: ${data.customerName}`);
  appendText(chunks, `Service: ${data.serviceType}`);
  if (data.trackingNumber) {
    appendText(chunks, `Shipment: ${data.trackingNumber}`);
  }
  if (data.weight != null) {
    appendText(chunks, `Weight: ${data.weight} kg`);
  }
  appendText(chunks, `Created: ${data.createdAt}`);
  appendText(chunks, `Due: ${data.dueDate}`);
  appendText(chunks, `Status: ${data.status.replace(/_/g, " ")}`);
  appendText(chunks, "--------------------------------");
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
