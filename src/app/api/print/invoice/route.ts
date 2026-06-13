import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { getCustomerIdForUser } from "@/lib/helpers";
import { printInvoiceEscPosToNetwork } from "@/lib/xprinter-server";
import { UserRole } from "@/types/enums";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  invoiceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("invoices:read");
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request");

    const invoice = await db.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      include: {
        customer: { select: { companyName: true } },
        shipment: { select: { trackingNumber: true, weight: true } },
      },
    });

    if (!invoice) return errorResponse("Invoice not found", 404);

    if (user.role === UserRole.CUSTOMER) {
      const customerId = await getCustomerIdForUser(user.id);
      if (invoice.customerId !== customerId) return errorResponse("Forbidden", 403);
    }

    const result = await printInvoiceEscPosToNetwork(invoice);

    if (result.ok) {
      return successResponse({ printed: true, method: "network" });
    }

    if (result.code === "PRINTER_NOT_CONFIGURED") {
      return successResponse({
        printed: false,
        method: null,
        code: result.code,
        message: "Network XPrinter is not configured. Set XPRINTER_HOST in your environment.",
      });
    }

    return successResponse({
      printed: false,
      method: null,
      code: result.code,
      message: result.message ?? "Failed to print to XPrinter over the network.",
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
