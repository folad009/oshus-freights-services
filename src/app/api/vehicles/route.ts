import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { AuthError } from "@/lib/api-auth";
import { createVehicleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import { getFleetReadContext, getFleetWriteContext, FleetAccessError } from "@/lib/fleet-access";

export async function GET() {
  try {
    await getFleetReadContext();

    const vehicles = await db.vehicle.findMany({
      include: {
        drivers: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { shipments: true } },
      },
      orderBy: { plateNumber: "asc" },
    });

    return successResponse(vehicles);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getFleetWriteContext();
    const body = await req.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const plateTaken = await db.vehicle.findUnique({
      where: { plateNumber: parsed.data.plateNumber.trim() },
    });
    if (plateTaken) return errorResponse("Plate number already in use");

    const vehicle = await db.vehicle.create({
      data: {
        plateNumber: parsed.data.plateNumber.trim(),
        type: parsed.data.type,
        capacity: parsed.data.capacity,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Vehicle",
      entityId: vehicle.id,
      details: `Added vehicle ${vehicle.plateNumber}`,
    });

    return successResponse(vehicle, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof FleetAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
