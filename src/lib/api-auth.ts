import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Permission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";
import { NextRequest } from "next/server";
import { errorResponse } from "./api-response";

export async function getAuthContext(permission?: Permission) {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }

  if (permission && !hasPermission(session.user.role, permission)) {
    throw new AuthError("Insufficient permissions", 403);
  }

  return session.user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function withAuth<T>(
  req: NextRequest,
  permission: Permission | undefined,
  handler: (user: { id: string; role: UserRole; email: string }) => Promise<T>
) {
  try {
    const user = await getAuthContext(permission);
    return await handler(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
}
