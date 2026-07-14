import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ShipmentStatus, UserRole, UserStatus } from "@/types/enums";
import { db } from "./db";
import {
  calculateCbm,
  createAuditLog,
  generateTrackingNumber,
} from "./helpers";
import {
  calculateInsuranceCost,
  createInvoiceForShipment,
  DELIVERY_SERVICE_FEE,
  PICKUP_SERVICE_FEE,
  TERMS_VERSION,
} from "./billing";
import { notifyCustomerCreated, notifyShipmentCreated } from "./notifications";
import {
  isCustomerGovernmentIdType,
  validateIdDocumentNumber,
} from "./id-document";
import { attachIntakePendingIdDocument } from "./id-document-storage";
import type { SubmitShipmentIntakeInput } from "./validations";
import { GovernmentIdType } from "@/types/enums";

export const INTAKE_LINK_TTL_DAYS = 14;

export function generateIntakeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function getIntakeLinkUrl(token: string, origin?: string) {
  const base = origin ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/shipment-request/${token}`;
}

export function isIntakeLinkActive(link: { usedAt: Date | null; expiresAt: Date }) {
  if (link.usedAt) return false;
  return link.expiresAt.getTime() > Date.now();
}

export async function getActiveIntakeLink(token: string) {
  const link = await db.shipmentIntakeLink.findUnique({
    where: { token },
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!link) return null;
  if (!isIntakeLinkActive(link)) return null;
  return link;
}

export async function submitShipmentIntake(token: string, data: SubmitShipmentIntakeInput) {
  const link = await db.shipmentIntakeLink.findUnique({
    where: { token },
  });

  if (!link) {
    throw new Error("This intake link is invalid.");
  }
  if (link.usedAt) {
    throw new Error("This intake link has already been used.");
  }
  if (link.expiresAt.getTime() <= Date.now()) {
    throw new Error("This intake link has expired.");
  }

  if (!isCustomerGovernmentIdType(data.idDocumentType)) {
    throw new Error("Select a valid ID document type");
  }
  validateIdDocumentNumber(data.idDocumentType, data.idDocumentNumber);

  const existingUser = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error("An account with this email already exists. Please sign in or contact support.");
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
  const nameParts = data.contactPerson.trim().split(/\s+/);
  const firstName = nameParts[0] ?? data.contactPerson;
  const lastName = nameParts.slice(1).join(" ") || "Customer";

  const requestPickup = data.requestPickup ?? false;
  const requestDelivery = data.requestDelivery ?? false;
  const hasInsurance = data.hasInsurance ?? false;
  const pickupServiceCost = requestPickup ? PICKUP_SERVICE_FEE : null;
  const deliveryServiceCost = requestDelivery ? DELIVERY_SERVICE_FEE : null;
  const insuranceCost =
    hasInsurance && data.declaredValue ? calculateInsuranceCost(data.declaredValue) : null;

  const cbm = calculateCbm({
    lengthCm: data.lengthCm,
    widthCm: data.widthCm,
    heightCm: data.heightCm,
    packageCount: data.packageCount,
  });

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email: data.email,
        passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    const customer = await tx.customer.create({
      data: {
        userId: user.id,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        address: data.address,
      },
    });

    const shipment = await tx.shipment.create({
      data: {
        trackingNumber: generateTrackingNumber(),
        customerId: customer.id,
        shipmentType: data.shipmentType,
        weight: data.weight,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        packageCount: data.packageCount ?? 1,
        cbm,
        origin: data.origin,
        destination: data.destination,
        warehouseId: link.warehouseId,
        scheduledPickup: data.scheduledPickup ? new Date(data.scheduledPickup) : undefined,
        notes: data.notes?.trim() || null,
        requestPickup,
        requestDelivery,
        pickupAddress: requestPickup ? data.pickupAddress?.trim() ?? null : null,
        deliveryAddress: requestDelivery ? data.deliveryAddress?.trim() ?? null : null,
        pickupServiceCost,
        deliveryServiceCost,
        hasInsurance,
        declaredValue: hasInsurance ? data.declaredValue ?? null : null,
        insuranceCost,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        events: {
          create: {
            eventType: ShipmentStatus.DRAFT,
            location: data.origin,
            notes: "Shipment submitted via customer intake link",
          },
        },
      },
      include: {
        customer: { select: { companyName: true } },
      },
    });

    await tx.shipmentIntakeLink.update({
      where: { id: link.id },
      data: {
        usedAt: new Date(),
        shipmentId: shipment.id,
      },
    });

    return { customer, shipment, userId: user.id };
  });

  const idDocument = await attachIntakePendingIdDocument({
    storageKey: data.idDocumentStorageKey.trim(),
    intakeToken: token,
    shipmentId: result.shipment.id,
    idDocumentType: data.idDocumentType as GovernmentIdType,
    idDocumentNumber: data.idDocumentNumber.trim(),
  });

  await db.shipment.update({
    where: { id: result.shipment.id },
    data: idDocument,
  });

  await createAuditLog({
    userId: link.createdById,
    action: "CREATE",
    entity: "Customer",
    entityId: result.customer.id,
    details: `Customer ${result.customer.companyName} created via intake link`,
  });

  await createAuditLog({
    userId: link.createdById,
    action: "CREATE",
    entity: "Shipment",
    entityId: result.shipment.id,
    details: `Shipment ${result.shipment.trackingNumber} submitted via intake link`,
  });

  await notifyCustomerCreated({
    companyName: result.customer.companyName,
    userId: result.userId,
  }).catch((error) => {
    console.error("Failed to notify customer created:", error);
  });

  await notifyShipmentCreated(result.shipment).catch((error) => {
    console.error("Failed to notify shipment created:", error);
  });

  await createInvoiceForShipment({
    shipmentId: result.shipment.id,
    customerId: result.shipment.customerId,
    shipmentType: result.shipment.shipmentType,
    weight: result.shipment.weight,
    trackingNumber: result.shipment.trackingNumber,
    userId: link.createdById,
    requestPickup,
    requestDelivery,
    hasInsurance,
    declaredValue: result.shipment.declaredValue,
  });

  return result.shipment;
}
