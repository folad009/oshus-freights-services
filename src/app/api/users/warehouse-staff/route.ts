import { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";

export async function GET() {
  try {
    await getAuthContext("warehouses:write");

    const users = await db.user.findMany({
      where: { role: UserRole.WAREHOUSE_STAFF, status: UserStatus.ACTIVE },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        warehouseAssignments: {
          select: {
            warehouseId: true,
            isManager: true,
            warehouse: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    return successResponse(users);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
