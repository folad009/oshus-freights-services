import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createCustomerSchema, customerProfileSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus, GovernmentIdType } from "@/types/enums";
import { createAuditLog } from "@/lib/helpers";
import { notifyCustomerCreated } from "@/lib/notifications";
import {
  isCustomerGovernmentIdType,
  validateIdDocumentNumber,
} from "@/lib/id-document";
import {
  attachPendingIdDocumentToCustomer,
  saveCustomerIdDocumentDirect,
} from "@/lib/id-document-storage";

type AuthUser = Awaited<ReturnType<typeof getAuthContext>>;

function sanitizeStorageError(error: unknown) {
  if (error instanceof Error && error.message.includes("ENOENT")) {
    return "File upload failed because this deployment still uses local disk storage. Redeploy the latest app version.";
  }
  if (
    error instanceof Error &&
    (error.message.includes("IdDocumentBlob") || error.message.includes("does not exist"))
  ) {
    return "The database schema is out of date. Redeploy the app to apply the latest updates.";
  }
  if (error instanceof Error) return error.message;
  return "Internal server error";
}

async function finalizeCustomerCreation(params: {
  user: AuthUser;
  customerId: string;
  companyName: string;
  userId: string;
  idDocument: {
    idDocumentType: GovernmentIdType;
    idDocumentNumber: string;
    idDocumentStorageKey: string;
    idDocumentOriginalName: string;
    idDocumentMimeType: string;
    idDocumentUploadedAt: Date;
  };
}) {
  const updatedCustomer = await db.customer.update({
    where: { id: params.customerId },
    data: params.idDocument,
    include: { user: { select: { email: true } } },
  });

  await createAuditLog({
    userId: params.user.id,
    action: "CREATE",
    entity: "Customer",
    entityId: params.customerId,
    details: `Created customer ${params.companyName}`,
  });

  await notifyCustomerCreated({ companyName: params.companyName, userId: params.userId });

  return updatedCustomer;
}

async function createCustomerFromFormData(req: NextRequest, user: AuthUser) {
  const formData = await req.formData();
  const file = formData.get("idDocumentFile");
  const idDocumentType = formData.get("idDocumentType");
  const idDocumentNumber = formData.get("idDocumentNumber");

  const parsedProfile = customerProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    contactPerson: formData.get("contactPerson"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedProfile.success) {
    return errorResponse(parsedProfile.error.issues[0].message);
  }

  if (!(file instanceof File)) {
    return errorResponse("Government ID document is required");
  }
  if (typeof idDocumentType !== "string" || !isCustomerGovernmentIdType(idDocumentType)) {
    return errorResponse("Select a valid ID document type");
  }
  if (typeof idDocumentNumber !== "string" || !idDocumentNumber.trim()) {
    return errorResponse("ID number is required");
  }

  try {
    validateIdDocumentNumber(idDocumentType, idDocumentNumber);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid ID number");
  }

  const existing = await db.user.findUnique({ where: { email: parsedProfile.data.email } });
  if (existing) return errorResponse("Email already registered");

  const passwordHash = await bcrypt.hash(parsedProfile.data.password, 12);

  const customer = await db.customer.create({
    data: {
      companyName: parsedProfile.data.companyName,
      contactPerson: parsedProfile.data.contactPerson,
      phone: parsedProfile.data.phone,
      address: parsedProfile.data.address,
      user: {
        create: {
          firstName: parsedProfile.data.contactPerson.split(" ")[0] ?? parsedProfile.data.contactPerson,
          lastName: parsedProfile.data.contactPerson.split(" ").slice(1).join(" ") || "Customer",
          email: parsedProfile.data.email,
          passwordHash,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
      },
    },
    include: { user: { select: { email: true } } },
  });

  try {
    const idDocument = await saveCustomerIdDocumentDirect({
      customerId: customer.id,
      file,
      idDocumentType,
      idDocumentNumber,
    });

    const updatedCustomer = await finalizeCustomerCreation({
      user,
      customerId: customer.id,
      companyName: customer.companyName,
      userId: customer.userId,
      idDocument,
    });

    return successResponse(updatedCustomer, 201);
  } catch (error) {
    await db.customer.delete({ where: { id: customer.id } }).catch(() => undefined);
    throw error;
  }
}

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
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return await createCustomerFromFormData(req, user);
    }

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

    const updatedCustomer = await finalizeCustomerCreation({
      user,
      customerId: customer.id,
      companyName: customer.companyName,
      userId: customer.userId,
      idDocument,
    });

    return successResponse(updatedCustomer, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return errorResponse(sanitizeStorageError(error), 500);
  }
}
