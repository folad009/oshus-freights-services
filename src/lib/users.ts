import { db } from "@/lib/db";
import { UserRole, UserStatus } from "@/types/enums";

export async function countActiveAdmins(excludeUserId?: string) {
  return db.user.count({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function assertCanModifyUser(params: {
  targetUserId: string;
  actorUserId: string;
  nextRole?: UserRole;
  nextStatus?: UserStatus;
}) {
  if (params.targetUserId === params.actorUserId) {
    if (params.nextStatus && params.nextStatus !== UserStatus.ACTIVE) {
      throw new Error("You cannot deactivate your own account");
    }
    if (params.nextRole && params.nextRole !== UserRole.ADMIN) {
      throw new Error("You cannot change your own role");
    }
  }

  const target = await db.user.findUnique({
    where: { id: params.targetUserId },
    include: {
      customer: { select: { id: true } },
      driver: { select: { id: true, _count: { select: { shipments: true } } } },
    },
  });

  if (!target) {
    throw new Error("User not found");
  }

  if (target.customer && params.nextRole && params.nextRole !== UserRole.CUSTOMER) {
    throw new Error("Customer accounts must be managed from the Customers page");
  }

  if (target.role === UserRole.ADMIN) {
    const demotingAdmin =
      params.nextRole !== undefined && params.nextRole !== UserRole.ADMIN;
    const deactivatingAdmin =
      params.nextStatus !== undefined && params.nextStatus !== UserStatus.ACTIVE;

    if (demotingAdmin || deactivatingAdmin) {
      const remainingAdmins = await countActiveAdmins(params.targetUserId);
      if (remainingAdmins === 0) {
        throw new Error("At least one active administrator is required");
      }
    }
  }

  if (
    target.driver &&
    params.nextRole &&
    params.nextRole !== UserRole.DRIVER &&
    target.driver._count.shipments > 0
  ) {
    throw new Error("Cannot change role while driver has assigned shipments");
  }

  return target;
}

export async function assertCanDeleteUser(params: {
  targetUserId: string;
  actorUserId: string;
}) {
  if (params.targetUserId === params.actorUserId) {
    throw new Error("You cannot delete your own account");
  }

  await assertCanModifyUser({
    targetUserId: params.targetUserId,
    actorUserId: params.actorUserId,
    nextStatus: UserStatus.INACTIVE,
  });
}
