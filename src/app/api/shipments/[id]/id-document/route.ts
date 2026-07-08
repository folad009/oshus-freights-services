import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { getCustomerIdForUser } from "@/lib/helpers";
import { readShipmentIdDocument } from "@/lib/id-document-storage";
import { assertShipmentWarehouseAccess, WarehouseAccessError } from "@/lib/warehouse-scope";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("shipments:read");
    const { id } = await params;

    const shipment = await db.shipment.findUnique({
      where: { id },
    });

    if (!shipment) return errorResponse("Shipment not found", 404);
    if (!shipment.idDocumentStorageKey) {
      return errorResponse("ID document not found", 404);
    }

    if (user.role === UserRole.CUSTOMER) {
      const customerId = await getCustomerIdForUser(user.id);
      if (shipment.customerId !== customerId) {
        return errorResponse("Forbidden", 403);
      }
    } else {
      await assertShipmentWarehouseAccess(user, shipment);
    }

    const buffer = await readShipmentIdDocument(shipment.idDocumentStorageKey);
    const mimeType = shipment.idDocumentMimeType ?? "application/octet-stream";
    const filename = shipment.idDocumentOriginalName ?? "id-document";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    if (error instanceof Error && error.message.includes("ENOENT")) {
      return errorResponse("ID document file is missing", 404);
    }
    return handleApiError(error);
  }
}
