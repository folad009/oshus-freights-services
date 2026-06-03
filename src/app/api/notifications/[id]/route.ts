import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthContext();
    const { id } = await params;

    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notification) return errorResponse("Notification not found", 404);

    const updated = await db.notification.update({
      where: { id },
      data: { read: true },
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
