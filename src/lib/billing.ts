import { InvoiceStatus } from "@/types/enums";
import type { ShipmentType as ShipmentTypeValue, PaymentMethod } from "@/types/enums";
import { getShipmentTypeLabel } from "@/lib/shipment-types";
import { db } from "./db";
import { createAuditLog, generateInvoiceNumber, generatePaymentReference, getInvoiceBalance, canPayInvoice } from "./helpers";
import { notifyInvoiceGenerated, notifyPaymentReceived } from "./notifications";

export const TERMS_VERSION = "1.0";
export const PICKUP_SERVICE_FEE = 35;
export const DELIVERY_SERVICE_FEE = 35;
export const INSURANCE_RATE = 0.02;
export const INSURANCE_MIN_FEE = 10;

const RATE_PER_KG: Record<ShipmentTypeValue, number> = {
  DOMESTIC: 2.0,
  INTERNATIONAL: 5.0,
  STANDARD_AIR_FREIGHT: 1.5,
  STANDARD_SEA_FREIGHT: 0.8,
  BULK_CARGO: 0.5,
};

const MIN_CHARGE: Record<ShipmentTypeValue, number> = {
  DOMESTIC: 25,
  INTERNATIONAL: 75,
  STANDARD_AIR_FREIGHT: 20,
  STANDARD_SEA_FREIGHT: 100,
  BULK_CARGO: 200,
};

const TAX_RATE = 0.1;
const INVOICE_DUE_DAYS = 30;

export function calculateBaseShipmentAmount(shipmentType: ShipmentTypeValue, weight: number) {
  return Math.max(
    MIN_CHARGE[shipmentType],
    Math.round(weight * RATE_PER_KG[shipmentType] * 100) / 100
  );
}

export function calculateInsuranceCost(declaredValue: number) {
  return Math.max(
    INSURANCE_MIN_FEE,
    Math.round(declaredValue * INSURANCE_RATE * 100) / 100
  );
}

export function calculateShipmentInvoiceBreakdown(params: {
  shipmentType: ShipmentTypeValue;
  weight: number;
  requestPickup?: boolean;
  requestDelivery?: boolean;
  hasInsurance?: boolean;
  declaredValue?: number | null;
}) {
  const baseAmount = calculateBaseShipmentAmount(params.shipmentType, params.weight);
  const pickupCost = params.requestPickup ? PICKUP_SERVICE_FEE : 0;
  const deliveryCost = params.requestDelivery ? DELIVERY_SERVICE_FEE : 0;
  const insuranceCost =
    params.hasInsurance && params.declaredValue && params.declaredValue > 0
      ? calculateInsuranceCost(params.declaredValue)
      : 0;

  const amount = Math.round((baseAmount + pickupCost + deliveryCost + insuranceCost) * 100) / 100;
  const tax = Math.round(amount * TAX_RATE * 100) / 100;

  return {
    baseAmount,
    pickupCost,
    deliveryCost,
    insuranceCost,
    amount,
    tax,
    totalAmount: amount + tax,
  };
}

/** @deprecated Use calculateShipmentInvoiceBreakdown */
export function calculateShipmentInvoiceAmount(shipmentType: ShipmentTypeValue, weight: number) {
  const baseAmount = calculateBaseShipmentAmount(shipmentType, weight);
  const tax = Math.round(baseAmount * TAX_RATE * 100) / 100;
  return { amount: baseAmount, tax, totalAmount: baseAmount + tax };
}

export function getShipmentServiceLabel(
  shipmentType: ShipmentTypeValue,
  options?: {
    requestPickup?: boolean;
    requestDelivery?: boolean;
    hasInsurance?: boolean;
  }
) {
  const parts = [getShipmentTypeLabel(shipmentType)];
  if (options?.requestPickup) parts.push("Door Pickup");
  if (options?.requestDelivery) parts.push("Door Delivery");
  if (options?.hasInsurance) parts.push("Insurance");
  return parts.join(" · ");
}

export async function createInvoiceForShipment(params: {
  shipmentId: string;
  customerId: string;
  shipmentType: ShipmentTypeValue;
  weight: number;
  trackingNumber: string;
  userId?: string;
  requestPickup?: boolean;
  requestDelivery?: boolean;
  hasInsurance?: boolean;
  declaredValue?: number | null;
}) {
  const breakdown = calculateShipmentInvoiceBreakdown({
    shipmentType: params.shipmentType,
    weight: params.weight,
    requestPickup: params.requestPickup,
    requestDelivery: params.requestDelivery,
    hasInsurance: params.hasInsurance,
    declaredValue: params.declaredValue,
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + INVOICE_DUE_DAYS);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      customerId: params.customerId,
      shipmentId: params.shipmentId,
      serviceType: getShipmentServiceLabel(params.shipmentType, {
        requestPickup: params.requestPickup,
        requestDelivery: params.requestDelivery,
        hasInsurance: params.hasInsurance,
      }),
      amount: breakdown.amount,
      tax: breakdown.tax,
      totalAmount: breakdown.totalAmount,
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
