import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { isCustomerGovernmentIdType } from "@/lib/id-document";
import { savePendingIdDocument } from "@/lib/id-document-storage";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("customers:write");
    if (user.role === UserRole.CUSTOMER) {
      return errorResponse("Only staff can upload ID documents here", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const idDocumentType = formData.get("idDocumentType");
    const idDocumentNumber = formData.get("idDocumentNumber");

    if (!(file instanceof File)) {
      return errorResponse("ID document file is required");
    }
    if (typeof idDocumentType !== "string" || !isCustomerGovernmentIdType(idDocumentType)) {
      return errorResponse("Select a valid ID document type");
    }
    if (typeof idDocumentNumber !== "string" || !idDocumentNumber.trim()) {
      return errorResponse("ID number is required");
    }

    const meta = await savePendingIdDocument({
      userId: user.id,
      file,
      idDocumentType,
      idDocumentNumber,
    });

    return successResponse(
      {
        storageKey: meta.storageKey,
        idDocumentType: meta.idDocumentType,
        idDocumentNumber: meta.idDocumentNumber,
        originalName: meta.originalName,
        mimeType: meta.mimeType,
      },
      201
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error && error.message) return errorResponse(error.message);
    return handleApiError(error);
  }
}
