import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getAuthContext();
    const canList =
      hasPermission(user.role, "shipments:assign") || hasPermission(user.role, "fleet:read");

    if (!canList) return errorResponse("Insufficient permissions", 403);

    const drivers = await db.driver.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        vehicle: { select: { id: true, plateNumber: true, type: true } },
        _count: { select: { shipments: true } },
      },
      orderBy: { user: { firstName: "asc" } },
    });

    return successResponse(drivers);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
