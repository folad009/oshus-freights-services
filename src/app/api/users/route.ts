import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthContext, AuthError } from "@/lib/api-auth";
import { createUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@/types/enums";
import { createAuditLog } from "@/lib/helpers";

export async function GET() {
  try {
    await getAuthContext("users:read");

    const users = await db.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthContext("users:write");
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return errorResponse("Email already registered");

    if (parsed.data.role === UserRole.DRIVER) {
      const licenseTaken = await db.driver.findUnique({
        where: { licenseNumber: parsed.data.licenseNumber!.trim() },
      });
      if (licenseTaken) return errorResponse("License number already in use");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: parsed.data.firstName.trim(),
          lastName: parsed.data.lastName.trim(),
          email: parsed.data.email.trim().toLowerCase(),
          passwordHash,
          role: parsed.data.role,
          status: UserStatus.ACTIVE,
        },
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

      if (parsed.data.role === UserRole.DRIVER) {
        await tx.driver.create({
          data: {
            userId: created.id,
            licenseNumber: parsed.data.licenseNumber!.trim(),
          },
        });
      }

      return created;
    });

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: `Created user ${user.email} (${user.role})`,
    });

    return successResponse(user, 201);
  } catch (error) {
    if (error instanceof AuthError) return errorResponse(error.message, error.status);
    return handleApiError(error);
  }
}
