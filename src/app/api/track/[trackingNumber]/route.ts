import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    const shipment = await db.shipment.findUnique({
      where: { trackingNumber: trackingNumber.toUpperCase() },
      include: {
        events: { orderBy: { timestamp: "desc" } },
        trackingUpdates: { orderBy: { timestamp: "desc" }, take: 1 },
      },
    });

    if (!shipment) return errorResponse("Shipment not found", 404);

    return successResponse({
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      estimatedDelivery: shipment.estimatedDelivery,
      events: shipment.events,
      currentLocation: shipment.trackingUpdates[0]?.location ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
