import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createShipmentIntakeLinkSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import {
  generateIntakeToken,
  getIntakeLinkUrl,
  INTAKE_LINK_TTL_DAYS,
} from "@/lib/shipment-intake";
import { assertWarehouseAccess, WarehouseAccessError } from "@/lib/warehouse-scope";
import { UserRole } from "@/types/enums";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("shipments:write");
    if (user.role === UserRole.CUSTOMER) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createShipmentIntakeLinkSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const warehouseId = parsed.data.warehouseId?.trim() || undefined;
    if (warehouseId) {
      const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) return errorResponse("Warehouse branch not found", 404);
      if (user.role === UserRole.WAREHOUSE_STAFF) {
        await assertWarehouseAccess(user, warehouseId);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INTAKE_LINK_TTL_DAYS);

    const link = await db.shipmentIntakeLink.create({
      data: {
        token: generateIntakeToken(),
        createdById: user.id,
        warehouseId: warehouseId ?? null,
        expiresAt,
      },
      include: {
        warehouse: { select: { code: true, name: true } },
      },
    });

    const origin = req.headers.get("origin") ?? undefined;
    const url = getIntakeLinkUrl(link.token, origin ?? undefined);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "ShipmentIntakeLink",
      entityId: link.id,
      details: `Created customer intake link expiring ${expiresAt.toISOString()}`,
    });

    return successResponse(
      {
        id: link.id,
        token: link.token,
        url,
        expiresAt: link.expiresAt,
        warehouse: link.warehouse,
      },
      201
    );
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
