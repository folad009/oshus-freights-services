import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";
import { getWarehouseScope, buildWarehouseListWhere } from "@/lib/warehouse-scope";

export async function GET() {
  try {
    const user = await getAuthContext();

    const canList =
      hasPermission(user.role, "warehouses:read") ||
      hasPermission(user.role, "shipments:write") ||
      hasPermission(user.role, "shipments:assign");

    if (!canList) {
      return errorResponse("Insufficient permissions", 403);
    }

    const scope = await getWarehouseScope(user);

    const warehouses = await db.warehouse.findMany({
      where: {
        isActive: true,
        ...buildWarehouseListWhere(scope),
      },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });

    return successResponse(warehouses);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
