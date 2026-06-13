import { AuditAction, UserRole, InvoiceStatus } from "@/types/enums";
import { db } from "./db";

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  details?: string;
}) {
  return db.auditLog.create({ data: params });
}

export function generateTrackingNumber(): string {
  const prefix = "OSH";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `INV-${year}-${random}`;
}

export function generatePaymentReference(): string {
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export function getInvoiceBalance(invoice: { totalAmount: number; payments: { amount: number }[] }) {
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.round((invoice.totalAmount - paid) * 100) / 100;
}

export function canPayInvoice(status: string) {
  return status === InvoiceStatus.SENT || status === InvoiceStatus.OVERDUE;
}

export async function getCustomerIdForUser(userId: string): Promise<string | null> {
  const customer = await db.customer.findUnique({ where: { userId } });
  return customer?.id ?? null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function calculateCbm(params: {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount?: number;
}) {
  const count = params.packageCount ?? 1;
  const cbm = (params.lengthCm * params.widthCm * params.heightCm * count) / 1_000_000;
  return Math.round(cbm * 10_000) / 10_000;
}

export function formatCbm(cbm: number | null | undefined) {
  if (cbm == null) return "—";
  return `${cbm.toFixed(3)} m³`;
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  ARRIVED_AT_HUB: "Arrived at Hub",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Failed Delivery",
  RETURNED: "Returned",
};

export const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-indigo-100 text-indigo-800",
  IN_TRANSIT: "bg-yellow-100 text-yellow-800",
  ARRIVED_AT_HUB: "bg-orange-100 text-orange-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  FAILED_DELIVERY: "bg-red-100 text-red-800",
  RETURNED: "bg-gray-100 text-gray-800",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export async function getSessionUserOrThrow() {
  const { auth } = await import("./auth");
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export function isAdmin(role: UserRole) {
  return role === UserRole.ADMIN;
}
