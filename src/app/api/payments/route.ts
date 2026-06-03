import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createPaymentSchema } from "@/lib/validations";
import { getCustomerIdForUser } from "@/lib/helpers";
import { processInvoicePayment } from "@/lib/billing";

export async function GET() {
  try {
    const user = await getAuthContext("payments:read");

    const where: Record<string, unknown> = {};
    if (user.role === UserRole.CUSTOMER) {
      const customerId = await getCustomerIdForUser(user.id);
      if (!customerId) return successResponse([]);
      where.invoice = { customerId };
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        invoice: {
          select: { invoiceNumber: true, customer: { select: { companyName: true } } },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return successResponse(payments);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("payments:write");
    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const result = await processInvoicePayment({
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      reference: parsed.data.reference,
      userId: user.id,
    });

    return successResponse(result.payment, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return handleApiError(error);
  }
}
