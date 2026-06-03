import { ShipmentStatus, InvoiceStatus, VehicleStatus, UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { getCustomerIdForUser } from "@/lib/helpers";
import { getWarehouseScope, buildWarehouseIdFilter } from "@/lib/warehouse-scope";

async function getDriverId(userId: string) {
  const driver = await db.driver.findUnique({ where: { userId }, select: { id: true } });
  return driver?.id ?? null;
}

async function buildShipmentWhere(user: { id: string; role: UserRole }) {
  if (user.role === UserRole.CUSTOMER) {
    const customerId = await getCustomerIdForUser(user.id);
    return customerId ? { customerId } : { id: { in: [] as string[] } };
  }
  if (user.role === UserRole.DRIVER) {
    const driverId = await getDriverId(user.id);
    return driverId ? { driverId } : { id: { in: [] as string[] } };
  }
  if (user.role === UserRole.WAREHOUSE_STAFF) {
    const scope = await getWarehouseScope(user);
    return buildWarehouseIdFilter(scope);
  }
  return {};
}

export async function GET() {
  try {
    const user = await getAuthContext();
    const shipmentWhere = await buildShipmentWhere(user);
    const fullAccessRoles: UserRole[] = [UserRole.ADMIN, UserRole.DISPATCHER, UserRole.FINANCE_OFFICER];
    const inventoryRoles: UserRole[] = [UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.DISPATCHER];
    const fleetRoles: UserRole[] = [UserRole.ADMIN, UserRole.DISPATCHER];
    const financeRoles: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE_OFFICER];

    const isFullAccess = fullAccessRoles.includes(user.role);
    const showInventory = inventoryRoles.includes(user.role);
    const showFleet = fleetRoles.includes(user.role);
    const showFinance = financeRoles.includes(user.role);

    const warehouseScope = await getWarehouseScope(user);
    const inventoryWhere = showInventory ? buildWarehouseIdFilter(warehouseScope) : {};

    const inventoryItems = showInventory
      ? await db.inventoryItem.findMany({
          where: inventoryWhere,
          select: { quantity: true, reorderLevel: true },
        })
      : [];
    const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderLevel).length;

    let invoiceWhere: Record<string, unknown> = {};
    if (user.role === UserRole.CUSTOMER) {
      const customerId = await getCustomerIdForUser(user.id);
      invoiceWhere = customerId ? { customerId } : { id: { in: [] as string[] } };
    }

    const [
      activeShipments,
      delayedShipments,
      deliveredShipments,
      totalRevenue,
      outstandingInvoices,
      totalInventory,
      fleetTotal,
      fleetInUse,
      recentShipments,
    ] = await Promise.all([
      db.shipment.count({
        where: {
          ...shipmentWhere,
          status: {
            notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.DRAFT],
          },
        },
      }),
      db.shipment.count({
        where: {
          ...shipmentWhere,
          status: { not: ShipmentStatus.DELIVERED },
          estimatedDelivery: { lt: new Date() },
        },
      }),
      db.shipment.count({
        where: { ...shipmentWhere, status: ShipmentStatus.DELIVERED },
      }),
      showFinance
        ? db.payment.aggregate({ _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: 0 } }),
      showFinance || user.role === UserRole.CUSTOMER
        ? db.invoice.count({
            where: {
              ...invoiceWhere,
              status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
            },
          })
        : Promise.resolve(0),
      showInventory
        ? db.inventoryItem.aggregate({
            where: inventoryWhere,
            _sum: { quantity: true },
          })
        : Promise.resolve({ _sum: { quantity: 0 } }),
      showFleet ? db.vehicle.count() : Promise.resolve(0),
      showFleet
        ? db.vehicle.count({ where: { status: VehicleStatus.IN_USE } })
        : Promise.resolve(0),
      db.shipment.findMany({
        where: shipmentWhere,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { companyName: true } } },
      }),
    ]);

    return successResponse({
      activeShipments,
      delayedShipments,
      deliveredShipments,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      outstandingInvoices,
      totalInventory: totalInventory._sum.quantity ?? 0,
      lowStockItems,
      fleetUtilization: fleetTotal > 0 ? Math.round((fleetInUse / fleetTotal) * 100) : 0,
      recentShipments,
      scope: isFullAccess ? "full" : user.role.toLowerCase(),
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
