import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { readCustomerIdDocument } from "@/lib/id-document-storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext("customers:read");
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        idDocumentStorageKey: true,
        idDocumentMimeType: true,
        idDocumentOriginalName: true,
      },
    });

    if (!customer) return errorResponse("Customer not found", 404);
    if (!customer.idDocumentStorageKey) {
      return errorResponse("ID document not found", 404);
    }

    const buffer = await readCustomerIdDocument(customer.idDocumentStorageKey);
    const mimeType = customer.idDocumentMimeType ?? "application/octet-stream";
    const filename = customer.idDocumentOriginalName ?? "id-document";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error && error.message.includes("ENOENT")) {
      return errorResponse("ID document file is missing", 404);
    }
    return handleApiError(error);
  }
}
