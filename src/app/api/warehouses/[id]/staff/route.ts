import { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { assignWarehouseStaffSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import { assertWarehouseAccess, WarehouseAccessError } from "@/lib/warehouse-scope";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("warehouses:read");
    const { id } = await params;
    await assertWarehouseAccess(user, id);

    const staff = await db.warehouseAssignment.findMany({
      where: { warehouseId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    return successResponse(staff);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("warehouses:write");
    if (user.role !== UserRole.ADMIN) {
      return errorResponse("Only administrators can assign warehouse staff", 403);
    }

    const { id: warehouseId } = await params;
    const body = await req.json();
    const parsed = assignWarehouseStaffSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return errorResponse("Warehouse not found", 404);

    const staffUser = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!staffUser || staffUser.role !== UserRole.WAREHOUSE_STAFF) {
      return errorResponse("User must have the Warehouse Staff role");
    }
    if (staffUser.status !== UserStatus.ACTIVE) {
      return errorResponse("User account is not active");
    }

    const isManager = parsed.data.isManager ?? false;

    const assignment = await db.warehouseAssignment.upsert({
      where: {
        userId_warehouseId: { userId: parsed.data.userId, warehouseId },
      },
      create: {
        userId: parsed.data.userId,
        warehouseId,
        isManager,
      },
      update: { isManager },
    });

    if (isManager) {
      await db.warehouse.update({
        where: { id: warehouseId },
        data: { managerId: parsed.data.userId },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "WarehouseAssignment",
      entityId: assignment.id,
      details: `Assigned ${staffUser.firstName} ${staffUser.lastName} to ${warehouse.code}`,
    });

    return successResponse(assignment, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("warehouses:write");
    if (user.role !== UserRole.ADMIN) {
      return errorResponse("Only administrators can remove warehouse staff", 403);
    }

    const { id: warehouseId } = await params;
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return errorResponse("userId is required");

    const assignment = await db.warehouseAssignment.findUnique({
      where: { userId_warehouseId: { userId, warehouseId } },
      include: { warehouse: true, user: true },
    });
    if (!assignment) return errorResponse("Assignment not found", 404);

    await db.warehouseAssignment.delete({
      where: { userId_warehouseId: { userId, warehouseId } },
    });

    if (assignment.isManager) {
      await db.warehouse.update({
        where: { id: warehouseId },
        data: { managerId: null },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "WarehouseAssignment",
      entityId: assignment.id,
      details: `Removed ${assignment.user.firstName} ${assignment.user.lastName} from ${assignment.warehouse.code}`,
    });

    return successResponse({ removed: true });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
