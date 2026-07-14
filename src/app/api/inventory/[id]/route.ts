import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateInventorySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import {
  assertWarehouseAccess,
  WarehouseAccessError,
} from "@/lib/warehouse-scope";

const inventoryInclude = {
  warehouse: { select: { id: true, name: true, code: true } },
  bin: { select: { id: true, code: true, name: true } },
  movements: { orderBy: { createdAt: "desc" as const }, take: 20 },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("inventory:read");
    const { id } = await params;

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: inventoryInclude,
    });

    if (!item) return errorResponse("Inventory item not found", 404);

    await assertWarehouseAccess(user, item.warehouseId);

    return successResponse(item);
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
    const user = await getAuthContext("inventory:write");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateInventorySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) return errorResponse("Inventory item not found", 404);

    await assertWarehouseAccess(user, existing.warehouseId);

    const quantityDelta = parsed.data.quantity - existing.quantity;

    const item = await db.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          productName: parsed.data.productName.trim(),
          category: parsed.data.category,
          quantity: parsed.data.quantity,
          unitCost: parsed.data.unitCost,
          reorderLevel: parsed.data.reorderLevel,
          binId: parsed.data.binId?.trim() || null,
        },
        include: inventoryInclude,
      });

      if (quantityDelta !== 0) {
        await tx.inventoryMovement.create({
          data: {
            inventoryId: id,
            operation: "ADJUSTMENT",
            quantity: Math.abs(quantityDelta),
            notes:
              parsed.data.adjustmentNotes?.trim() ||
              `Quantity ${quantityDelta > 0 ? "increased" : "decreased"} by ${Math.abs(quantityDelta)}`,
          },
        });
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "InventoryItem",
      entityId: id,
      details: `Updated inventory item ${item.sku} (${item.productName})`,
    });

    return successResponse(item);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
