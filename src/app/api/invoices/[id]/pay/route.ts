import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { payInvoiceSchema } from "@/lib/validations";
import { generatePaymentReference, getCustomerIdForUser, getInvoiceBalance, canPayInvoice } from "@/lib/helpers";
import { initializePaystackTransaction } from "@/lib/paystack";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("invoices:read");
    const { id } = await params;
    const body = await req.json();
    const parsed = payInvoiceSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    if (user.role !== UserRole.CUSTOMER) {
      return errorResponse("Only customers can pay invoices through this endpoint", 403);
    }

    const customerId = await getCustomerIdForUser(user.id);
    if (!customerId) return errorResponse("Customer profile not found", 404);

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true, customer: { select: { companyName: true } } },
    });

    if (!invoice) return errorResponse("Invoice not found", 404);
    if (invoice.customerId !== customerId) return errorResponse("Forbidden", 403);

    if (!canPayInvoice(invoice.status)) {
      return errorResponse("This invoice is not available for payment", 400);
    }

    const balance = getInvoiceBalance(invoice);
    if (balance <= 0) {
      return errorResponse("Invoice is already paid", 400);
    }

    const callbackBase =
      process.env.PAYSTACK_CALLBACK_URL?.trim() || process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const callbackUrl = `${callbackBase.replace(/\/$/, "")}/payments/callback`;

    const reference = parsed.data.reference || generatePaymentReference();
    const channelsByMethod: Record<string, string[]> = {
      CREDIT_CARD: ["card"],
      BANK_TRANSFER: ["bank", "bank_transfer", "ussd"],
      MOBILE_MONEY: ["mobile_money"],
    };

    const paystack = await initializePaystackTransaction({
      email: user.email,
      amountInNaira: balance,
      callbackUrl,
      reference,
      channels: channelsByMethod[parsed.data.paymentMethod] ?? ["card", "bank_transfer", "mobile_money"],
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentMethod: parsed.data.paymentMethod,
        customerId: invoice.customerId,
        customerName: invoice.customer.companyName,
      },
    });

    return successResponse({
      authorizationUrl: paystack.authorization_url,
      accessCode: paystack.access_code,
      reference: paystack.reference,
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return handleApiError(error);
  }
}
