import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createVehicleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";

export async function GET() {
  try {
    await getAuthContext("fleet:read");

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
    const user = await getAuthContext("fleet:write");
    const body = await req.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const vehicle = await db.vehicle.create({ data: parsed.data });

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
    return handleApiError(error);
  }
}
