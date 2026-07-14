import { NextRequest } from "next/server";
import { ShipmentStatus, UserRole, GovernmentIdType } from "@/types/enums";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createShipmentSchema, updateShipmentSchema } from "@/lib/validations";
import { createAuditLog, generateTrackingNumber, getCustomerIdForUser, calculateCbm } from "@/lib/helpers";
import {
  createInvoiceForShipment,
  calculateInsuranceCost,
  PICKUP_SERVICE_FEE,
  DELIVERY_SERVICE_FEE,
  TERMS_VERSION,
} from "@/lib/billing";
import { notifyShipmentCreated } from "@/lib/notifications";
import {
  isCustomerGovernmentIdType,
  validateIdDocumentNumber,
} from "@/lib/id-document";
import { attachPendingIdDocument } from "@/lib/id-document-storage";
import {
  getWarehouseScope,
  buildWarehouseIdFilter,
  assertWarehouseAccess,
  WarehouseAccessError,
} from "@/lib/warehouse-scope";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthContext("shipments:read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ShipmentStatus | null;
    const customerId = searchParams.get("customerId");
    const warehouseId = searchParams.get("warehouseId");

    const scope = await getWarehouseScope(user);
    const warehouseFilter = buildWarehouseIdFilter(scope, warehouseId);

    const where: Record<string, unknown> = { ...warehouseFilter };

    if (status) where.status = status;

    if (user.role === UserRole.CUSTOMER) {
      const cid = await getCustomerIdForUser(user.id);
      if (!cid) return successResponse([]);
      where.customerId = cid;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (user.role === UserRole.DRIVER) {
      const driver = await db.driver.findUnique({ where: { userId: user.id } });
      if (!driver) return successResponse([]);
      where.driverId = driver.id;
    }

    const shipments = await db.shipment.findMany({
      where,
      include: {
        customer: { select: { companyName: true, contactPerson: true } },
        driver: { include: { user: { select: { firstName: true, lastName: true } } } },
        vehicle: { select: { plateNumber: true, type: true } },
        dispatcher: { select: { firstName: true, lastName: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        events: { orderBy: { timestamp: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(shipments);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("shipments:write");
    const body = await req.json();
    const parsed = createShipmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    let customerId = parsed.data.customerId?.trim() || undefined;
    if (user.role === UserRole.CUSTOMER) {
      customerId = (await getCustomerIdForUser(user.id)) ?? undefined;
      if (!customerId) return errorResponse("Customer profile not found", 404);
      if (!parsed.data.acceptedTerms) {
        return errorResponse("You must accept the terms and conditions");
      }
      if (!parsed.data.idDocumentType || !parsed.data.idDocumentStorageKey?.trim()) {
        return errorResponse("A valid government-issued ID document is required");
      }
      if (!parsed.data.idDocumentNumber?.trim()) {
        return errorResponse("ID number is required");
      }
      if (!isCustomerGovernmentIdType(parsed.data.idDocumentType)) {
        return errorResponse("Select a valid ID document type");
      }
      try {
        validateIdDocumentNumber(parsed.data.idDocumentType, parsed.data.idDocumentNumber);
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : "Invalid ID number");
      }
    }
    if (!customerId) return errorResponse("Customer ID is required");

    const warehouseId = parsed.data.warehouseId?.trim() || undefined;

    if (warehouseId) {
      const warehouse = await db.warehouse.findUnique({
        where: { id: warehouseId },
      });
      if (!warehouse) return errorResponse("Warehouse branch not found", 404);
      if (user.role === UserRole.WAREHOUSE_STAFF) {
        await assertWarehouseAccess(user, warehouseId);
      }
    }

    const cbm = calculateCbm({
      lengthCm: parsed.data.lengthCm,
      widthCm: parsed.data.widthCm,
      heightCm: parsed.data.heightCm,
      packageCount: parsed.data.packageCount,
    });

    const requestPickup = parsed.data.requestPickup ?? false;
    const requestDelivery = parsed.data.requestDelivery ?? false;
    const hasInsurance = parsed.data.hasInsurance ?? false;
    const pickupServiceCost = requestPickup ? PICKUP_SERVICE_FEE : null;
    const deliveryServiceCost = requestDelivery ? DELIVERY_SERVICE_FEE : null;
    const insuranceCost =
      hasInsurance && parsed.data.declaredValue
        ? calculateInsuranceCost(parsed.data.declaredValue)
        : null;

    const shipment = await db.shipment.create({
      data: {
        trackingNumber: generateTrackingNumber(),
        customerId,
        shipmentType: parsed.data.shipmentType,
        weight: parsed.data.weight,
        lengthCm: parsed.data.lengthCm,
        widthCm: parsed.data.widthCm,
        heightCm: parsed.data.heightCm,
        packageCount: parsed.data.packageCount ?? 1,
        cbm,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        warehouseId: warehouseId ?? null,
        scheduledPickup: parsed.data.scheduledPickup
          ? new Date(parsed.data.scheduledPickup)
          : undefined,
        notes: parsed.data.notes,
        requestPickup,
        requestDelivery,
        pickupAddress: requestPickup ? parsed.data.pickupAddress?.trim() ?? null : null,
        deliveryAddress: requestDelivery ? parsed.data.deliveryAddress?.trim() ?? null : null,
        pickupServiceCost,
        deliveryServiceCost,
        hasInsurance,
        declaredValue: hasInsurance ? parsed.data.declaredValue ?? null : null,
        insuranceCost,
        termsAcceptedAt: user.role === UserRole.CUSTOMER ? new Date() : null,
        termsVersion: user.role === UserRole.CUSTOMER ? TERMS_VERSION : null,
        events: {
          create: {
            eventType: ShipmentStatus.DRAFT,
            location: parsed.data.origin,
            notes: "Shipment created",
          },
        },
      },
      include: {
        customer: { select: { companyName: true } },
        warehouse: { select: { code: true, name: true } },
      },
    });

    if (
      user.role === UserRole.CUSTOMER &&
      parsed.data.idDocumentType &&
      parsed.data.idDocumentStorageKey
    ) {
      const idDocument = await attachPendingIdDocument({
        storageKey: parsed.data.idDocumentStorageKey.trim(),
        userId: user.id,
        shipmentId: shipment.id,
        idDocumentType: parsed.data.idDocumentType as GovernmentIdType,
        idDocumentNumber: parsed.data.idDocumentNumber!.trim(),
      });

      await db.shipment.update({
        where: { id: shipment.id },
        data: idDocument,
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Shipment",
      entityId: shipment.id,
      details: `Created shipment ${shipment.trackingNumber}`,
    });

    await notifyShipmentCreated(shipment).catch((error) => {
      console.error("Failed to send shipment notifications:", error);
    });

    if (user.role === UserRole.CUSTOMER) {
      await createInvoiceForShipment({
        shipmentId: shipment.id,
        customerId: shipment.customerId,
        shipmentType: shipment.shipmentType,
        weight: shipment.weight,
        trackingNumber: shipment.trackingNumber,
        userId: user.id,
        requestPickup,
        requestDelivery,
        hasInsurance,
        declaredValue: shipment.declaredValue,
      });
    }

    return successResponse(shipment, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
