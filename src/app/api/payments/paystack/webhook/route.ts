import { NextRequest, NextResponse } from "next/server";
import {
  fulfillInvoiceFromPaystackCharge,
  verifyPaystackWebhookSignature,
  type PaystackChargePayload,
} from "@/lib/paystack-fulfillment";

type PaystackWebhookEvent = {
  event: string;
  data?: PaystackChargePayload;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
  }

  let payload: PaystackWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return NextResponse.json({ success: true, message: "Event ignored" });
  }

  try {
    const result = await fulfillInvoiceFromPaystackCharge(payload.data);
    return NextResponse.json({
      success: true,
      message: result.alreadyRecorded ? "Payment already recorded" : "Payment recorded",
    });
  } catch (error) {
    console.error("[paystack-webhook]", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";

    // Non-retryable business errors — acknowledge so Paystack does not keep retrying.
    const nonRetryable = [
      "Unable to resolve invoice for this payment",
      "Invoice not found",
      "Invoice is already paid",
      "Verified amount does not match the outstanding invoice balance",
      "Payment is not successful",
    ];
    if (nonRetryable.includes(message)) {
      return NextResponse.json({ success: false, message }, { status: 200 });
    }

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
