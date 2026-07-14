import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { AuthError } from "@/lib/api-auth";
import { updateVehicleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import { getFleetReadContext, getFleetWriteContext, FleetAccessError } from "@/lib/fleet-access";
import { ShipmentStatus } from "@/types/enums";

const vehicleInclude = {
  drivers: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  shipments: {
    where: {
      status: {
        notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      origin: true,
      destination: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { shipments: true, drivers: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getFleetReadContext();
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: vehicleInclude,
    });

    if (!vehicle) return errorResponse("Vehicle not found", 404);
    return successResponse(vehicle);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getFleetWriteContext();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateVehicleSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.vehicle.findUnique({ where: { id } });
    if (!existing) return errorResponse("Vehicle not found", 404);

    if (parsed.data.plateNumber.trim() !== existing.plateNumber) {
      const plateTaken = await db.vehicle.findUnique({
        where: { plateNumber: parsed.data.plateNumber.trim() },
      });
      if (plateTaken) return errorResponse("Plate number already in use");
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: {
        plateNumber: parsed.data.plateNumber.trim(),
        type: parsed.data.type,
        capacity: parsed.data.capacity,
        status: parsed.data.status,
        fuelUsage: parsed.data.fuelUsage ?? existing.fuelUsage,
        lastMaintenance:
          parsed.data.lastMaintenance === null
            ? null
            : parsed.data.lastMaintenance
              ? new Date(parsed.data.lastMaintenance)
              : undefined,
        nextMaintenance:
          parsed.data.nextMaintenance === null
            ? null
            : parsed.data.nextMaintenance
              ? new Date(parsed.data.nextMaintenance)
              : undefined,
      },
      include: vehicleInclude,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Vehicle",
      entityId: id,
      details: `Updated vehicle ${vehicle.plateNumber}`,
    });

    return successResponse(vehicle);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof FleetAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
