import { NextRequest } from "next/server";
import { InvoiceStatus, UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createInvoiceSchema } from "@/lib/validations";
import { createAuditLog, generateInvoiceNumber, getCustomerIdForUser } from "@/lib/helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthContext("invoices:read");
    const status = new URL(req.url).searchParams.get("status") as InvoiceStatus | null;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (user.role === UserRole.CUSTOMER) {
      const cid = await getCustomerIdForUser(user.id);
      if (!cid) return successResponse([]);
      where.customerId = cid;
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        customer: { select: { companyName: true } },
        shipment: { select: { trackingNumber: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(invoices);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("invoices:write");
    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const tax = parsed.data.tax ?? 0;
    const totalAmount = parsed.data.amount + tax;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: parsed.data.customerId,
        shipmentId: parsed.data.shipmentId,
        serviceType: parsed.data.serviceType,
        amount: parsed.data.amount,
        tax,
        totalAmount,
        dueDate: new Date(parsed.data.dueDate),
        status: InvoiceStatus.DRAFT,
      },
      include: { customer: { select: { companyName: true } } },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
      details: `Created invoice ${invoice.invoiceNumber}`,
    });

    return successResponse(invoice, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
