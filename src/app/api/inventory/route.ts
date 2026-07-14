import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createInventorySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import {
  getWarehouseScope,
  buildWarehouseIdFilter,
  assertWarehouseAccess,
  WarehouseAccessError,
} from "@/lib/warehouse-scope";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthContext("inventory:read");
    const warehouseId = new URL(req.url).searchParams.get("warehouseId");
    const scope = await getWarehouseScope(user);

    const inventory = await db.inventoryItem.findMany({
      where: buildWarehouseIdFilter(scope, warehouseId),
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        bin: { select: { code: true } },
      },
      orderBy: { productName: "asc" },
    });

    return successResponse(inventory);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("inventory:write");
    const body = await req.json();
    const parsed = createInventorySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    await assertWarehouseAccess(user, parsed.data.warehouseId);

    const duplicate = await db.inventoryItem.findFirst({
      where: {
        warehouseId: parsed.data.warehouseId,
        sku: parsed.data.sku.trim(),
      },
    });
    if (duplicate) {
      return errorResponse("SKU already exists for this warehouse branch");
    }

    const item = await db.inventoryItem.create({
      data: {
        ...parsed.data,
        sku: parsed.data.sku.trim(),
        productName: parsed.data.productName.trim(),
      },
      include: { warehouse: { select: { name: true, code: true } } },
    });

    await db.inventoryMovement.create({
      data: {
        inventoryId: item.id,
        operation: "INBOUND",
        quantity: parsed.data.quantity,
        notes: "Initial stock",
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "InventoryItem",
      entityId: item.id,
      details: `Added ${item.productName} (${item.sku}) to ${item.warehouse.code}`,
    });

    return successResponse(item, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
