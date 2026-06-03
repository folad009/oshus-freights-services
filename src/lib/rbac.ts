import { UserRole } from "@/types/enums";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  CUSTOMER: "Customer",
  WAREHOUSE_STAFF: "Warehouse Staff",
  DRIVER: "Driver",
  DISPATCHER: "Dispatcher",
  FINANCE_OFFICER: "Finance Officer",
};

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  CUSTOMER: "/dashboard/customer",
  WAREHOUSE_STAFF: "/dashboard/warehouse",
  DRIVER: "/dashboard/driver",
  DISPATCHER: "/dashboard/dispatcher",
  FINANCE_OFFICER: "/dashboard/finance",
};

export type Permission =
  | "shipments:read"
  | "shipments:write"
  | "shipments:assign"
  | "inventory:read"
  | "inventory:write"
  | "warehouses:read"
  | "warehouses:write"
  | "fleet:read"
  | "fleet:write"
  | "invoices:read"
  | "invoices:write"
  | "payments:read"
  | "payments:write"
  | "customers:read"
  | "customers:write"
  | "users:read"
  | "users:write"
  | "reports:read"
  | "audit:read"
  | "support:read"
  | "support:write";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "shipments:read", "shipments:write", "shipments:assign",
    "inventory:read", "inventory:write",
    "warehouses:read", "warehouses:write",
    "fleet:read", "fleet:write",
    "invoices:read", "invoices:write",
    "payments:read", "payments:write",
    "customers:read", "customers:write",
    "users:read", "users:write",
    "reports:read", "audit:read",
    "support:read", "support:write",
  ],
  CUSTOMER: [
    "shipments:read", "shipments:write",
    "invoices:read", "payments:read",
    "support:read", "support:write",
  ],
  WAREHOUSE_STAFF: [
    "shipments:read", "shipments:assign",
    "inventory:read", "inventory:write",
    "warehouses:read",
    "fleet:read",
  ],
  DRIVER: [
    "shipments:read", "shipments:write",
  ],
  DISPATCHER: [
    "shipments:read", "shipments:write", "shipments:assign",
    "fleet:read", "fleet:write", "reports:read",
  ],
  FINANCE_OFFICER: [
    "shipments:read",
    "invoices:read", "invoices:write",
    "payments:read", "payments:write",
    "customers:read", "reports:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("Insufficient permissions");
  }
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  permission?: Permission;
}

export function getNavItems(role: UserRole, basePath: string): NavItem[] {
  const items: NavItem[] = [
    { title: "Dashboard", href: basePath, icon: "LayoutDashboard" },
    { title: "Shipments", href: "/dashboard/shipments", icon: "Package", permission: "shipments:read" },
    { title: "Customers", href: "/dashboard/customers", icon: "Users", permission: "customers:read" },
    { title: "Inventory", href: "/dashboard/inventory", icon: "Boxes", permission: "inventory:read" },
    { title: "Warehouses", href: "/dashboard/warehouses", icon: "Warehouse", permission: "warehouses:read" },
    { title: "Fleet", href: "/dashboard/fleet", icon: "Truck", permission: "fleet:read" },
    { title: "Invoices", href: "/dashboard/invoices", icon: "FileText", permission: "invoices:read" },
    { title: "Payments", href: "/dashboard/payments", icon: "CreditCard", permission: "payments:read" },
    { title: "Support", href: "/dashboard/support", icon: "HeadphonesIcon", permission: "support:read" },
    { title: "Reports", href: "/dashboard/reports", icon: "BarChart3", permission: "reports:read" },
    { title: "Users", href: "/dashboard/users", icon: "UserCog", permission: "users:read" },
    { title: "Audit Logs", href: "/dashboard/audit", icon: "Shield", permission: "audit:read" },
  ];

  return items.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );
}
