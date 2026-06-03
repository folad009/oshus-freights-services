import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { getCustomerIdForUser } from "@/lib/helpers";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { fulfillInvoiceFromPaystackCharge } from "@/lib/paystack-fulfillment";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("invoices:read");
    if (user.role !== UserRole.CUSTOMER) {
      return errorResponse("Only customers can verify invoice payments", 403);
    }

    const body = (await req.json()) as { reference?: string; invoiceId?: string };
    if (!body.reference) {
      return errorResponse("Payment reference is required");
    }

    const customerId = await getCustomerIdForUser(user.id);
    if (!customerId) return errorResponse("Customer profile not found", 404);

    const verification = await verifyPaystackTransaction(body.reference);
    if (verification.status !== "success") {
      return errorResponse("Payment is not successful", 400);
    }

    const invoiceIdFromMetadata =
      typeof verification.metadata?.invoiceId === "string"
        ? verification.metadata.invoiceId
        : undefined;
    const invoiceId = body.invoiceId || invoiceIdFromMetadata;
    if (!invoiceId) {
      return errorResponse("Unable to resolve invoice for this payment", 400);
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { customerId: true },
    });
    if (!invoice) return errorResponse("Invoice not found", 404);
    if (invoice.customerId !== customerId) return errorResponse("Forbidden", 403);

    const result = await fulfillInvoiceFromPaystackCharge(
      {
        reference: verification.reference,
        amount: verification.amount,
        status: verification.status,
        channel: verification.channel,
        metadata: {
          ...verification.metadata,
          invoiceId,
        },
      },
      { userId: user.id }
    );

    return successResponse(
      {
        payment: result.payment,
        paidInFull: result.paidInFull,
        balanceRemaining: "balanceRemaining" in result ? result.balanceRemaining : 0,
        alreadyRecorded: result.alreadyRecorded,
      },
      result.alreadyRecorded ? 200 : 201
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return handleApiError(error);
  }
}
