import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { submitShipmentIntakeSchema } from "@/lib/validations";
import { submitShipmentIntake } from "@/lib/shipment-intake";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = submitShipmentIntakeSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message);
    }

    const shipment = await submitShipmentIntake(token, parsed.data);

    return successResponse(
      {
        trackingNumber: shipment.trackingNumber,
        shipmentId: shipment.id,
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message) {
      return errorResponse(error.message);
    }
    return handleApiError(error);
  }
}
