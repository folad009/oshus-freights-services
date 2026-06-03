import { NextRequest } from "next/server";
import { UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createWarehouseSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import { getWarehouseScope, buildWarehouseListWhere } from "@/lib/warehouse-scope";

export async function GET() {
  try {
    const user = await getAuthContext("warehouses:read");
    const scope = await getWarehouseScope(user);

    const warehouses = await db.warehouse.findMany({
      where: buildWarehouseListWhere(scope),
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
        _count: { select: { inventory: true, zones: true, assignments: true } },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(warehouses);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("warehouses:write");
    if (user.role !== UserRole.ADMIN) {
      return errorResponse("Only administrators can create warehouse branches", 403);
    }

    const body = await req.json();
    const parsed = createWarehouseSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existingCode = await db.warehouse.findUnique({
      where: { code: parsed.data.code },
    });
    if (existingCode) return errorResponse("Branch code already exists");

    const warehouse = await db.warehouse.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        phone: parsed.data.phone,
        managerId: parsed.data.managerId,
        isActive: parsed.data.isActive ?? true,
      },
      include: {
        manager: { select: { firstName: true, lastName: true } },
      },
    });

    if (parsed.data.managerId) {
      await db.warehouseAssignment.upsert({
        where: {
          userId_warehouseId: {
            userId: parsed.data.managerId,
            warehouseId: warehouse.id,
          },
        },
        create: {
          userId: parsed.data.managerId,
          warehouseId: warehouse.id,
          isManager: true,
        },
        update: { isManager: true },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Warehouse",
      entityId: warehouse.id,
      details: `Created warehouse branch ${warehouse.code} — ${warehouse.name}`,
    });

    return successResponse(warehouse, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
