import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getActiveIntakeLink } from "@/lib/shipment-intake";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const link = await getActiveIntakeLink(token);

    if (!link) {
      return errorResponse("This intake link is invalid or has expired.", 404);
    }

    return successResponse({
      expiresAt: link.expiresAt,
      warehouse: link.warehouse,
      createdBy: link.createdBy,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
