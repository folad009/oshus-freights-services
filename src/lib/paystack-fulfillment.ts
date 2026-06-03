import crypto from "crypto";
import type { PaymentMethod } from "@/types/enums";
import { db } from "./db";
import { getInvoiceBalance } from "./helpers";
import { processInvoicePayment } from "./billing";
import { getPaystackSecretKey } from "./paystack";

export type PaystackChargePayload = {
  reference: string;
  amount: number;
  status: string;
  channel?: string;
  metadata?: {
    invoiceId?: string;
    paymentMethod?: string;
    [key: string]: unknown;
  };
};

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha512", getPaystackSecretKey())
    .update(rawBody)
    .digest("hex");

  if (hash.length !== signature.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

function resolvePaymentMethod(
  channel: string | undefined,
  metadataMethod: string | undefined
): PaymentMethod {
  if (
    metadataMethod === "BANK_TRANSFER" ||
    metadataMethod === "MOBILE_MONEY" ||
    metadataMethod === "CREDIT_CARD"
  ) {
    return metadataMethod;
  }

  const normalized = channel?.toLowerCase() ?? "";
  if (normalized.includes("mobile")) return "MOBILE_MONEY";
  if (normalized === "card") return "CREDIT_CARD";
  return "BANK_TRANSFER";
}

export async function fulfillInvoiceFromPaystackCharge(
  charge: PaystackChargePayload,
  options?: { userId?: string }
) {
  if (charge.status !== "success") {
    throw new Error("Payment is not successful");
  }

  const invoiceId =
    typeof charge.metadata?.invoiceId === "string" ? charge.metadata.invoiceId : undefined;
  if (!invoiceId) {
    throw new Error("Unable to resolve invoice for this payment");
  }

  const existingPayment = await db.payment.findFirst({
    where: { reference: charge.reference },
  });
  if (existingPayment) {
    return {
      payment: existingPayment,
      paidInFull: true,
      alreadyRecorded: true as const,
    };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const verifiedAmountNaira = charge.amount / 100;
  const outstandingBalance = getInvoiceBalance(invoice);
  if (outstandingBalance <= 0) {
    throw new Error("Invoice is already paid");
  }

  if (Math.abs(verifiedAmountNaira - outstandingBalance) > 0.01) {
    throw new Error("Verified amount does not match the outstanding invoice balance");
  }

  const metadataMethod =
    typeof charge.metadata?.paymentMethod === "string"
      ? charge.metadata.paymentMethod
      : undefined;

  const result = await processInvoicePayment({
    invoiceId: invoice.id,
    amount: outstandingBalance,
    paymentMethod: resolvePaymentMethod(charge.channel, metadataMethod),
    reference: charge.reference,
    userId: options?.userId,
  });

  return { ...result, alreadyRecorded: false as const };
}
