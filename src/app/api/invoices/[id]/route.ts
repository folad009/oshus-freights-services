import { NextRequest } from "next/server";
import { InvoiceStatus, UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateInvoiceSchema } from "@/lib/validations";
import { createAuditLog, getCustomerIdForUser } from "@/lib/helpers";
import { notifyInvoiceGenerated } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("invoices:read");
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true, userId: true } },
        shipment: { select: { id: true, trackingNumber: true, weight: true } },
        payments: true,
      },
    });

    if (!invoice) return errorResponse("Invoice not found", 404);

    if (user.role === UserRole.CUSTOMER) {
      const cid = await getCustomerIdForUser(user.id);
      if (invoice.customerId !== cid) return errorResponse("Forbidden", 403);
    }

    return successResponse(invoice);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("invoices:write");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { customer: { select: { userId: true, companyName: true } } },
    });
    if (!existing) return errorResponse("Invoice not found", 404);

    if (existing.status === InvoiceStatus.PAID && parsed.data.status !== InvoiceStatus.CANCELLED) {
      return errorResponse("Paid invoices cannot be modified");
    }

    const amount = parsed.data.amount ?? existing.amount;
    const tax = parsed.data.tax ?? existing.tax;
    const totalAmount = amount + tax;

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        serviceType: parsed.data.serviceType,
        amount: parsed.data.amount,
        tax: parsed.data.tax,
        totalAmount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        status: parsed.data.status,
      },
      include: {
        customer: { select: { companyName: true } },
        shipment: { select: { trackingNumber: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      details: `Updated invoice ${invoice.invoiceNumber}`,
    });

    if (parsed.data.status === InvoiceStatus.SENT && existing.status !== InvoiceStatus.SENT) {
      await notifyInvoiceGenerated({
        invoiceNumber: invoice.invoiceNumber,
        customerUserId: existing.customer.userId,
        totalAmount: invoice.totalAmount,
      });
    }

    return successResponse(invoice);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
