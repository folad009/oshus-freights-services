import { NextRequest } from "next/server";
import { ShipmentStatus, UserRole } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateShipmentSchema } from "@/lib/validations";
import { createAuditLog, getCustomerIdForUser, calculateCbm } from "@/lib/helpers";
import {
  notifyShipmentStatusChanged,
  notifyDriverAssigned,
  notifyDispatcherAssigned,
} from "@/lib/notifications";
import { hasPermission } from "@/lib/rbac";
import {
  assertShipmentWarehouseAccess,
  assertWarehouseAccess,
  WarehouseAccessError,
} from "@/lib/warehouse-scope";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("shipments:read");
    const { id } = await params;

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        vehicle: true,
        dispatcher: { select: { id: true, firstName: true, lastName: true, email: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        events: { orderBy: { timestamp: "desc" } },
        trackingUpdates: { orderBy: { timestamp: "desc" }, take: 20 },
        invoices: true,
      },
    });

    if (!shipment) return errorResponse("Shipment not found", 404);

    if (user.role === UserRole.CUSTOMER) {
      const cid = await getCustomerIdForUser(user.id);
      if (shipment.customerId !== cid) return errorResponse("Forbidden", 403);
    }

    await assertShipmentWarehouseAccess(user, shipment);

    return successResponse(shipment);
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
    const user = await getAuthContext("shipments:read");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    if (user.role === UserRole.CUSTOMER) {
      return errorResponse("Customers cannot modify shipments", 403);
    }

    const existing = await db.shipment.findUnique({ where: { id } });
    if (!existing) return errorResponse("Shipment not found", 404);

    await assertShipmentWarehouseAccess(user, existing);

    const {
      shipmentType,
      weight,
      lengthCm,
      widthCm,
      heightCm,
      packageCount,
      origin,
      destination,
      status,
      driverId,
      vehicleId,
      dispatcherId,
      warehouseId,
      scheduledPickup,
      estimatedDelivery,
      notes,
    } = parsed.data;

    const mergedLength = lengthCm ?? existing.lengthCm;
    const mergedWidth = widthCm ?? existing.widthCm;
    const mergedHeight = heightCm ?? existing.heightCm;
    const mergedPackageCount = packageCount ?? existing.packageCount;

    const dimensionUpdate =
      lengthCm !== undefined ||
      widthCm !== undefined ||
      heightCm !== undefined ||
      packageCount !== undefined;

    let cbm: number | undefined;
    if (
      dimensionUpdate &&
      mergedLength != null &&
      mergedWidth != null &&
      mergedHeight != null
    ) {
      cbm = calculateCbm({
        lengthCm: mergedLength,
        widthCm: mergedWidth,
        heightCm: mergedHeight,
        packageCount: mergedPackageCount,
      });
    }

    const isAssigning =
      (driverId !== undefined && driverId !== existing.driverId) ||
      (vehicleId !== undefined && vehicleId !== existing.vehicleId) ||
      (dispatcherId !== undefined && dispatcherId !== existing.dispatcherId);

    const isUpdatingDetails =
      shipmentType !== undefined ||
      weight !== undefined ||
      lengthCm !== undefined ||
      widthCm !== undefined ||
      heightCm !== undefined ||
      packageCount !== undefined ||
      origin !== undefined ||
      destination !== undefined ||
      status !== undefined ||
      warehouseId !== undefined ||
      scheduledPickup !== undefined ||
      estimatedDelivery !== undefined ||
      notes !== undefined;

    const canWrite = hasPermission(user.role, "shipments:write");
    const canAssign = hasPermission(user.role, "shipments:assign");

    if (isUpdatingDetails && !canWrite) {
      return errorResponse("Insufficient permissions to update shipment", 403);
    }

    if (isAssigning && !canAssign && !canWrite) {
      return errorResponse("Insufficient permissions to assign shipment", 403);
    }

    if (!isUpdatingDetails && !isAssigning) {
      return errorResponse("No valid fields to update", 400);
    }

    if (warehouseId !== undefined && warehouseId !== null) {
      const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) return errorResponse("Warehouse branch not found", 404);
      if (user.role === UserRole.WAREHOUSE_STAFF) {
        await assertWarehouseAccess(user, warehouseId);
      }
    }

    let resolvedStatus = status;
    if (
      resolvedStatus === undefined &&
      existing.status === ShipmentStatus.DRAFT &&
      isAssigning &&
      (driverId || dispatcherId)
    ) {
      resolvedStatus = ShipmentStatus.SCHEDULED;
    }

    const shipment = await db.shipment.update({
      where: { id },
      data: {
        shipmentType,
        weight,
        lengthCm,
        widthCm,
        heightCm,
        packageCount,
        cbm,
        origin,
        destination,
        status: resolvedStatus,
        driverId,
        vehicleId,
        dispatcherId,
        warehouseId,
        scheduledPickup:
          scheduledPickup === null ? null : scheduledPickup ? new Date(scheduledPickup) : undefined,
        estimatedDelivery:
          estimatedDelivery === null
            ? null
            : estimatedDelivery
              ? new Date(estimatedDelivery)
              : undefined,
        notes,
        actualDelivery: resolvedStatus === ShipmentStatus.DELIVERED ? new Date() : undefined,
      },
      include: {
        customer: { select: { companyName: true, userId: true } },
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        dispatcher: { select: { id: true, firstName: true, lastName: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    const statusChanged = resolvedStatus && resolvedStatus !== existing.status;

    if (statusChanged) {
      await db.shipmentEvent.create({
        data: {
          shipmentId: id,
          eventType: resolvedStatus!,
          location: shipment.destination,
          notes: `Status changed to ${resolvedStatus}`,
        },
      });

      await createAuditLog({
        userId: user.id,
        action: "STATUS_CHANGE",
        entity: "Shipment",
        entityId: id,
        details: `Status: ${existing.status} → ${resolvedStatus}`,
      });

      await notifyShipmentStatusChanged(
        {
          id: shipment.id,
          trackingNumber: shipment.trackingNumber,
          customerId: shipment.customerId,
          status: shipment.status,
        },
        existing.status
      );
    }

    if (isAssigning && driverId && driverId !== existing.driverId && shipment.driver?.user) {
      await createAuditLog({
        userId: user.id,
        action: "UPDATE",
        entity: "Shipment",
        entityId: id,
        details: `Assigned driver to shipment ${shipment.trackingNumber}`,
      });

      await notifyDriverAssigned({
        trackingNumber: shipment.trackingNumber,
        driverUserId: shipment.driver.user.id,
        origin: shipment.origin,
        destination: shipment.destination,
      });
    }

    if (isAssigning && dispatcherId && dispatcherId !== existing.dispatcherId && shipment.dispatcher) {
      await createAuditLog({
        userId: user.id,
        action: "UPDATE",
        entity: "Shipment",
        entityId: id,
        details: `Assigned dispatcher to shipment ${shipment.trackingNumber}`,
      });

      await notifyDispatcherAssigned({
        trackingNumber: shipment.trackingNumber,
        dispatcherUserId: shipment.dispatcher.id,
        origin: shipment.origin,
        destination: shipment.destination,
      });
    }

    return successResponse(shipment);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext("shipments:write");
    const { id } = await params;

    if (user.role === UserRole.CUSTOMER) {
      return errorResponse("Customers cannot delete shipments", 403);
    }

    const existing = await db.shipment.findUnique({ where: { id } });
    if (!existing) return errorResponse("Shipment not found", 404);
    await assertShipmentWarehouseAccess(user, existing);

    await db.shipment.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entity: "Shipment",
      entityId: id,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
