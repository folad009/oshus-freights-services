import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { updateUserSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/helpers";
import { assertCanDeleteUser, assertCanModifyUser } from "@/lib/users";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@/types/enums";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  customer: { select: { id: true } },
  driver: { select: { licenseNumber: true } },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext("users:read");
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
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
    const actor = await getAuthContext("users:write");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await assertCanModifyUser({
      targetUserId: id,
      actorUserId: actor.id,
      nextRole: parsed.data.role,
      nextStatus: parsed.data.status,
    });

    if (existing.customer && parsed.data.role !== UserRole.CUSTOMER) {
      return errorResponse("Customer accounts must be managed from the Customers page", 400);
    }

    if (parsed.data.email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (emailTaken) return errorResponse("Email already in use");
    }

    if (parsed.data.role === UserRole.DRIVER) {
      const licenseNumber = parsed.data.licenseNumber!.trim();
      const licenseTaken = await db.driver.findFirst({
        where: {
          licenseNumber,
          userId: { not: id },
        },
      });
      if (licenseTaken) return errorResponse("License number already in use");
    }

    const passwordHash =
      parsed.data.password && parsed.data.password.length > 0
        ? await bcrypt.hash(parsed.data.password, 12)
        : undefined;

    const user = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          firstName: parsed.data.firstName.trim(),
          lastName: parsed.data.lastName.trim(),
          email: parsed.data.email.trim().toLowerCase(),
          role: parsed.data.role,
          status: parsed.data.status,
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: userSelect,
      });

      if (parsed.data.role === UserRole.DRIVER) {
        await tx.driver.upsert({
          where: { userId: id },
          update: { licenseNumber: parsed.data.licenseNumber!.trim() },
          create: {
            userId: id,
            licenseNumber: parsed.data.licenseNumber!.trim(),
          },
        });
      } else if (existing.driver) {
        await tx.driver.delete({ where: { userId: id } });
      }

      return updated;
    });

    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      details: `Updated user ${user.email}`,
    });

    return successResponse(user);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error && error.message) return errorResponse(error.message, 400);
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthContext("users:write");
    const { id } = await params;

    await assertCanDeleteUser({ targetUserId: id, actorUserId: actor.id });

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return errorResponse("User not found", 404);

    const user = await db.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "User",
      entityId: id,
      details: `Deactivated user ${existing.email}`,
    });

    return successResponse({ deleted: true, user });
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    if (error instanceof Error && error.message) return errorResponse(error.message, 400);
    return handleApiError(error);
  }
}
