import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { canManageFleet } from "@/lib/fleet-access";

export async function GET() {
  try {
    const user = await getAuthContext("fleet:read");

    return successResponse({ canWrite: canManageFleet(user) });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
