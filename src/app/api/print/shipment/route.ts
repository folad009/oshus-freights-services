import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { assertShipmentWarehouseAccess, WarehouseAccessError } from "@/lib/warehouse-scope";
import { printManifestEscPosToNetwork } from "@/lib/xprinter-server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  shipmentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthContext("shipments:read");
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request");

    const shipment = await db.shipment.findUnique({
      where: { id: parsed.data.shipmentId },
      include: {
        customer: {
          select: { companyName: true, contactPerson: true, phone: true },
        },
        warehouse: { select: { code: true, name: true } },
      },
    });

    if (!shipment) return errorResponse("Shipment not found", 404);

    await assertShipmentWarehouseAccess(user, shipment);

    const result = await printManifestEscPosToNetwork(shipment);

    if (result.ok) {
      return successResponse({ printed: true, method: "network" });
    }

    if (result.code === "PRINTER_NOT_CONFIGURED") {
      return successResponse({
        printed: false,
        method: null,
        code: result.code,
        message: "Network XPrinter is not configured. Set XPRINTER_HOST in your environment.",
      });
    }

    return successResponse({
      printed: false,
      method: null,
      code: result.code,
      message: result.message ?? "Failed to print manifest to XPrinter over the network.",
    });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof WarehouseAccessError) return errorResponse(error.message, 403);
    return handleApiError(error);
  }
}
