import { getAuthContext } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";
import { UserRole } from "@/types/enums";

export class FleetAccessError extends Error {
  constructor(message = "Insufficient fleet permissions") {
    super(message);
    this.name = "FleetAccessError";
  }
}

export function canManageFleet(user: { role: UserRole }) {
  return hasPermission(user.role, "fleet:write");
}

export async function getFleetReadContext() {
  return getAuthContext("fleet:read");
}

export async function getFleetWriteContext() {
  return getAuthContext("fleet:write");
}
