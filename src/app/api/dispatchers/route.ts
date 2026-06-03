import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getAuthContext();
    if (!hasPermission(user.role, "shipments:assign")) {
      return errorResponse("Insufficient permissions", 403);
    }

    const dispatchers = await db.user.findMany({
      where: { role: UserRole.DISPATCHER, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: { select: { dispatchedShipments: true } },
      },
      orderBy: { firstName: "asc" },
    });

    return successResponse(dispatchers);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
