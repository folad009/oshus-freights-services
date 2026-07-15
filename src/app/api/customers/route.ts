import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createCustomerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus, GovernmentIdType } from "@/types/enums";
import { createAuditLog } from "@/lib/helpers";
import { notifyCustomerCreated } from "@/lib/notifications";
import {
  isCustomerGovernmentIdType,
  validateIdDocumentNumber,
} from "@/lib/id-document";
import { attachPendingIdDocumentToCustomer } from "@/lib/id-document-storage";

export async function GET() {
  try {
    await getAuthContext("customers:read");

    const customers = await db.customer.findMany({
      include: {
        user: { select: { email: true, status: true, firstName: true, lastName: true } },
        _count: { select: { shipments: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(customers);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("customers:write");
    const body = await req.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    if (!isCustomerGovernmentIdType(parsed.data.idDocumentType)) {
      return errorResponse("Select a valid ID document type");
    }
    try {
      validateIdDocumentNumber(parsed.data.idDocumentType, parsed.data.idDocumentNumber);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid ID number");
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return errorResponse("Email already registered");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const customer = await db.customer.create({
      data: {
        companyName: parsed.data.companyName,
        contactPerson: parsed.data.contactPerson,
        phone: parsed.data.phone,
        address: parsed.data.address,
        user: {
          create: {
            firstName: parsed.data.contactPerson.split(" ")[0] ?? parsed.data.contactPerson,
            lastName: parsed.data.contactPerson.split(" ").slice(1).join(" ") || "Customer",
            email: parsed.data.email,
            passwordHash,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
          },
        },
      },
      include: { user: { select: { email: true } } },
    });

    const idDocument = await attachPendingIdDocumentToCustomer({
      storageKey: parsed.data.idDocumentStorageKey.trim(),
      userId: user.id,
      customerId: customer.id,
      idDocumentType: parsed.data.idDocumentType as GovernmentIdType,
      idDocumentNumber: parsed.data.idDocumentNumber.trim(),
    });

    const updatedCustomer = await db.customer.update({
      where: { id: customer.id },
      data: idDocument,
      include: { user: { select: { email: true } } },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      details: `Created customer ${customer.companyName}`,
    });

    await notifyCustomerCreated({ companyName: customer.companyName, userId: customer.userId });

    return successResponse(updatedCustomer, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error && error.message) return errorResponse(error.message);
    return handleApiError(error);
  }
}
