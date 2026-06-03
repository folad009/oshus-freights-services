import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateWarehouseSchema } from "@/lib/validations";
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

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
        _count: { select: { inventory: true, zones: true } },
      },
    });

    if (!warehouse) return errorResponse("Warehouse not found", 404);
    return successResponse(warehouse);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("warehouses:write");
    if (user.role !== UserRole.ADMIN) {
      return errorResponse("Only administrators can update warehouse branches", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateWarehouseSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.warehouse.findUnique({ where: { id } });
    if (!existing) return errorResponse("Warehouse not found", 404);

    if (parsed.data.code && parsed.data.code !== existing.code) {
      const codeTaken = await db.warehouse.findUnique({ where: { code: parsed.data.code } });
      if (codeTaken) return errorResponse("Branch code already exists");
    }

    const warehouse = await db.warehouse.update({
      where: { id },
      data: parsed.data,
      include: {
        manager: { select: { firstName: true, lastName: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (parsed.data.managerId !== undefined) {
      if (parsed.data.managerId) {
        await db.warehouseAssignment.upsert({
          where: {
            userId_warehouseId: { userId: parsed.data.managerId, warehouseId: id },
          },
          create: { userId: parsed.data.managerId, warehouseId: id, isManager: true },
          update: { isManager: true },
        });
        await db.warehouse.update({
          where: { id },
          data: { managerId: parsed.data.managerId },
        });
      } else {
        await db.warehouse.update({ where: { id }, data: { managerId: null } });
      }
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Warehouse",
      entityId: id,
      details: `Updated warehouse branch ${warehouse.code}`,
    });

    return successResponse(warehouse);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("warehouses:write");
    if (user.role !== UserRole.ADMIN) {
      return errorResponse("Only administrators can delete warehouse branches", 403);
    }

    const { id } = await params;
    const existing = await db.warehouse.findUnique({ where: { id } });
    if (!existing) return errorResponse("Warehouse not found", 404);

    await db.warehouse.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "Warehouse",
      entityId: id,
      details: `Deleted warehouse branch ${existing.code}`,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
