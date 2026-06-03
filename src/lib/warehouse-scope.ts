import { UserRole } from "@/types/enums";
import { db } from "./db";

export type WarehouseScope =
  | { type: "all" }
  | { type: "assigned"; warehouseIds: string[] };

export async function getAssignedWarehouseIds(userId: string): Promise<string[]> {
  const assignments = await db.warehouseAssignment.findMany({
    where: { userId },
    select: { warehouseId: true },
  });
  return assignments.map((a) => a.warehouseId);
}

export async function getWarehouseScope(user: {
  id: string;
  role: UserRole;
}): Promise<WarehouseScope> {
  if (user.role === UserRole.ADMIN) {
    return { type: "all" };
  }

  if (user.role === UserRole.WAREHOUSE_STAFF) {
    const warehouseIds = await getAssignedWarehouseIds(user.id);
    return { type: "assigned", warehouseIds };
  }

  return { type: "all" };
}

export function buildWarehouseIdFilter(
  scope: WarehouseScope,
  requestedWarehouseId?: string | null
): { warehouseId?: string | { in: string[] } } | { warehouseId: { in: [] } } {
  if (scope.type === "all") {
    return requestedWarehouseId ? { warehouseId: requestedWarehouseId } : {};
  }

  if (!scope.warehouseIds.length) {
    return { warehouseId: { in: [] } };
  }

  if (requestedWarehouseId) {
    if (!scope.warehouseIds.includes(requestedWarehouseId)) {
      return { warehouseId: { in: [] } };
    }
    return { warehouseId: requestedWarehouseId };
  }

  return { warehouseId: { in: scope.warehouseIds } };
}

export async function assertWarehouseAccess(
  user: { id: string; role: UserRole },
  warehouseId: string
) {
  const scope = await getWarehouseScope(user);
  if (scope.type === "all") return;

  if (!scope.warehouseIds.includes(warehouseId)) {
    throw new WarehouseAccessError("You do not have access to this warehouse");
  }
}

export class WarehouseAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarehouseAccessError";
  }
}

export function buildWarehouseListWhere(scope: WarehouseScope) {
  if (scope.type === "all") return {};
  if (!scope.warehouseIds.length) return { id: { in: [] as string[] } };
  return { id: { in: scope.warehouseIds } };
}

export async function assertShipmentWarehouseAccess(
  user: { id: string; role: UserRole },
  shipment: { warehouseId: string | null }
) {
  const scope = await getWarehouseScope(user);
  if (scope.type === "all") return;

  if (!shipment.warehouseId || !scope.warehouseIds.includes(shipment.warehouseId)) {
    throw new WarehouseAccessError("You do not have access to this shipment");
  }
}
