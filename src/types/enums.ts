/**
 * Application enums mirrored from prisma/schema.prisma.
 * Use these instead of importing from @prisma/client in app/UI code
 * so TypeScript works even before `prisma generate` runs.
 */

export const UserRole = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  WAREHOUSE_STAFF: "WAREHOUSE_STAFF",
  DRIVER: "DRIVER",
  DISPATCHER: "DISPATCHER",
  FINANCE_OFFICER: "FINANCE_OFFICER",
  MARKETING: "MARKETING",
  FRONT_DESK: "FRONT_DESK",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ShipmentType = {
  DOMESTIC: "DOMESTIC",
  EXPRESS: "EXPRESS",
  STANDARD_AIR_FREIGHT: "STANDARD_AIR_FREIGHT",
  STANDARD_SEA_FREIGHT: "STANDARD_SEA_FREIGHT",
} as const;

export type ShipmentType = (typeof ShipmentType)[keyof typeof ShipmentType];

export const ShipmentStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED_AT_HUB: "ARRIVED_AT_HUB",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED_DELIVERY: "FAILED_DELIVERY",
  RETURNED: "RETURNED",
} as const;

export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const GovernmentIdType = {
  NIN: "NIN",
  INTERNATIONAL_PASSPORT: "INTERNATIONAL_PASSPORT",
  DRIVERS_LICENSE: "DRIVERS_LICENSE",
  NATIONAL_ID: "NATIONAL_ID",
  OTHER_GOVERNMENT_ID: "OTHER_GOVERNMENT_ID",
} as const;

export type GovernmentIdType = (typeof GovernmentIdType)[keyof typeof GovernmentIdType];

export const InventoryCategory = {
  PACKAGING_MATERIALS: "PACKAGING_MATERIALS",
  GOODS: "GOODS",
  SPARE_PARTS: "SPARE_PARTS",
  RETURNED_ITEMS: "RETURNED_ITEMS",
  WAREHOUSE_SUPPLIES: "WAREHOUSE_SUPPLIES",
} as const;

export type InventoryCategory =
  (typeof InventoryCategory)[keyof typeof InventoryCategory];

export const VehicleType = {
  MOTORCYCLE: "MOTORCYCLE",
  VAN: "VAN",
  TRUCK: "TRUCK",
  CONTAINER_TRUCK: "CONTAINER_TRUCK",
  CARGO_VEHICLE: "CARGO_VEHICLE",
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  CREDIT_CARD: "CREDIT_CARD",
  CASH: "CASH",
  CHEQUE: "CHEQUE",
  MOBILE_MONEY: "MOBILE_MONEY",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const TicketCategory = {
  SHIPMENT_DELAY: "SHIPMENT_DELAY",
  DAMAGED_GOODS: "DAMAGED_GOODS",
  LOST_SHIPMENT: "LOST_SHIPMENT",
  BILLING_ISSUE: "BILLING_ISSUE",
  GENERAL_INQUIRY: "GENERAL_INQUIRY",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  STATUS_CHANGE: "STATUS_CHANGE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
} as const;

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const NotificationType = {
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  SHIPMENT_STATUS_CHANGED: "SHIPMENT_STATUS_CHANGED",
  SHIPMENT_DELIVERED: "SHIPMENT_DELIVERED",
  CUSTOMER_CREATED: "CUSTOMER_CREATED",
  INVOICE_GENERATED: "INVOICE_GENERATED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  SYSTEM: "SYSTEM",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
