import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateCustomerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext("customers:read");
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, status: true } },
        _count: { select: { shipments: true, invoices: true } },
      },
    });

    if (!customer) return errorResponse("Customer not found", 404);
    return successResponse(customer);
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
    const user = await getAuthContext("customers:write");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.customer.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) return errorResponse("Customer not found", 404);

    if (parsed.data.email !== existing.user.email) {
      const emailTaken = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (emailTaken) return errorResponse("Email already in use");
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        companyName: parsed.data.companyName,
        contactPerson: parsed.data.contactPerson,
        phone: parsed.data.phone,
        address: parsed.data.address,
        user: {
          update: {
            email: parsed.data.email,
            firstName: parsed.data.contactPerson.split(" ")[0] ?? parsed.data.contactPerson,
            lastName: parsed.data.contactPerson.split(" ").slice(1).join(" ") || "Customer",
          },
        },
      },
      include: { user: { select: { email: true } } },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      details: `Updated customer ${customer.companyName}`,
    });

    return successResponse(customer);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("customers:write");
    const { id } = await params;

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) return errorResponse("Customer not found", 404);

    await db.customer.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      details: `Deleted customer ${existing.companyName}`,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
