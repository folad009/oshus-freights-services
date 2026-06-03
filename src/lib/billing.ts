import { InvoiceStatus } from "@/types/enums";
import type { ShipmentType as ShipmentTypeValue, PaymentMethod } from "@/types/enums";
import { db } from "./db";
import { createAuditLog, generateInvoiceNumber, generatePaymentReference, getInvoiceBalance, canPayInvoice } from "./helpers";
import { notifyInvoiceGenerated, notifyPaymentReceived } from "./notifications";

const RATE_PER_KG: Record<ShipmentTypeValue, number> = {
  DOMESTIC: 2.0,
  INTERNATIONAL: 5.0,
  EXPRESS: 4.0,
  STANDARD: 1.5,
  FREIGHT: 0.8,
  BULK_CARGO: 0.5,
};

const MIN_CHARGE: Record<ShipmentTypeValue, number> = {
  DOMESTIC: 25,
  INTERNATIONAL: 75,
  EXPRESS: 50,
  STANDARD: 20,
  FREIGHT: 100,
  BULK_CARGO: 200,
};

const TAX_RATE = 0.1;
const INVOICE_DUE_DAYS = 30;

export function calculateShipmentInvoiceAmount(
  shipmentType: ShipmentTypeValue,
  weight: number
) {
  const amount = Math.max(
    MIN_CHARGE[shipmentType],
    Math.round(weight * RATE_PER_KG[shipmentType] * 100) / 100
  );
  const tax = Math.round(amount * TAX_RATE * 100) / 100;
  return { amount, tax, totalAmount: amount + tax };
}

export function getShipmentServiceLabel(shipmentType: ShipmentTypeValue) {
  return `${shipmentType.replace(/_/g, " ")} Shipping`;
}

export async function createInvoiceForShipment(params: {
  shipmentId: string;
  customerId: string;
  shipmentType: ShipmentTypeValue;
  weight: number;
  trackingNumber: string;
  userId?: string;
}) {
  const { amount, tax, totalAmount } = calculateShipmentInvoiceAmount(
    params.shipmentType,
    params.weight
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + INVOICE_DUE_DAYS);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      customerId: params.customerId,
      shipmentId: params.shipmentId,
      serviceType: getShipmentServiceLabel(params.shipmentType),
      amount,
      tax,
      totalAmount,
      dueDate,
      status: InvoiceStatus.SENT,
    },
    include: {
      customer: { select: { userId: true } },
    },
  });

  if (params.userId) {
    await createAuditLog({
      userId: params.userId,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
      details: `Auto-generated invoice ${invoice.invoiceNumber} for shipment ${params.trackingNumber}`,
    });
  }

  await notifyInvoiceGenerated({
    invoiceNumber: invoice.invoiceNumber,
    customerUserId: invoice.customer.userId,
    totalAmount: invoice.totalAmount,
  });

  return invoice;
}

export async function processInvoicePayment(params: {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  userId?: string;
}) {
  const invoice = await db.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      payments: true,
      customer: { select: { userId: true, companyName: true } },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (!canPayInvoice(invoice.status)) {
    throw new Error("This invoice cannot be paid in its current status");
  }

  const balance = getInvoiceBalance(invoice);
  if (balance <= 0) {
    throw new Error("Invoice is already paid");
  }

  if (params.amount > balance) {
    throw new Error("Payment amount exceeds outstanding balance");
  }

  const payment = await db.payment.create({
    data: {
      invoiceId: params.invoiceId,
      paymentMethod: params.paymentMethod,
      amount: params.amount,
      reference: params.reference ?? generatePaymentReference(),
    },
  });

  const paidInFull = params.amount >= balance;
  if (paidInFull) {
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.PAID },
    });
  }

  if (params.userId) {
    await createAuditLog({
      userId: params.userId,
      action: "CREATE",
      entity: "Payment",
      entityId: payment.id,
      details: `Payment of ${params.amount} for invoice ${invoice.invoiceNumber}`,
    });
  }

  await notifyPaymentReceived({
    invoiceNumber: invoice.invoiceNumber,
    amount: params.amount,
    customerUserId: invoice.customer.userId,
    paidInFull,
  });

  return { payment, invoice, paidInFull, balanceRemaining: balance - params.amount };
}
