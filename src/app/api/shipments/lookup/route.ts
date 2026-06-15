import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { assertShipmentWarehouseAccess, WarehouseAccessError } from "@/lib/warehouse-scope";
import { normalizeShipmentBarcode } from "@/lib/barcode";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthContext("shipments:read");
    const trackingNumber = new URL(req.url).searchParams.get("trackingNumber");

    if (!trackingNumber?.trim()) {
      return errorResponse("Tracking number is required");
    }

    const shipment = await db.shipment.findUnique({
      where: { trackingNumber: normalizeShipmentBarcode(trackingNumber) },
      include: {
        customer: {
          select: {
            companyName: true,
            contactPerson: true,
            phone: true,
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
        driver: { include: { user: { select: { firstName: true, lastName: true } } } },
        dispatcher: { select: { firstName: true, lastName: true } },
        events: { orderBy: { timestamp: "desc" }, take: 5 },
      },
    });

    if (!shipment) return errorResponse("Shipment not found", 404);

    await assertShipmentWarehouseAccess(user, shipment);

    return successResponse(shipment);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
