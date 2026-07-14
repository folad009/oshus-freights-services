import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { isCustomerGovernmentIdType } from "@/lib/id-document";
import { getActiveIntakeLink } from "@/lib/shipment-intake";
import { saveIntakePendingIdDocument } from "@/lib/id-document-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await getActiveIntakeLink(token);
    if (!link) {
      return errorResponse("This intake link is invalid or has expired.", 404);
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

    const meta = await saveIntakePendingIdDocument({
      intakeToken: token,
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
    if (error instanceof Error && error.message) return errorResponse(error.message);
    return handleApiError(error);
  }
}
