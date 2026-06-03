import { z } from "zod";
import {
  ShipmentType,
  ShipmentStatus,
  InventoryCategory,
  VehicleType,
  InvoiceStatus,
  PaymentMethod,
  TicketCategory,
  UserRole,
} from "@/types/enums";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

export const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateCustomerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email"),
});

export const createShipmentSchema = z.object({
  customerId: z.string().optional(),
  shipmentType: z.nativeEnum(ShipmentType),
  weight: z.number({ message: "Weight is required" }).positive("Weight must be greater than 0"),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  scheduledPickup: z.string().optional(),
  notes: z.string().optional(),
  warehouseId: z.string().optional(),
});

export const updateShipmentSchema = z.object({
  shipmentType: z.nativeEnum(ShipmentType).optional(),
  weight: z.number().positive().optional(),
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  dispatcherId: z.string().optional().nullable(),
  scheduledPickup: z.string().optional().nullable(),
  estimatedDelivery: z.string().optional().nullable(),
  notes: z.string().optional(),
  warehouseId: z.string().optional().nullable(),
});

export const createInventorySchema = z.object({
  warehouseId: z.string(),
  binId: z.string().optional(),
  sku: z.string().min(1),
  productName: z.string().min(1),
  category: z.nativeEnum(InventoryCategory),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0),
  reorderLevel: z.number().int().min(0).optional(),
});

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1),
  type: z.nativeEnum(VehicleType),
  capacity: z.number().positive(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  shipmentId: z.string().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  amount: z.number({ message: "Amount is required" }).positive("Amount must be greater than 0"),
  tax: z.number().min(0).optional(),
  dueDate: z.string().min(1, "Due date is required"),
});

export const updateInvoiceSchema = z.object({
  serviceType: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  tax: z.number().min(0).optional(),
  dueDate: z.string().min(1).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});

export const assignShipmentSchema = z.object({
  driverId: z.string().nullable(),
  vehicleId: z.string().nullable(),
  dispatcherId: z.string().nullable(),
});

export const payInvoiceSchema = z.object({
  paymentMethod: z.enum(["CREDIT_CARD", "BANK_TRANSFER", "MOBILE_MONEY"] as const),
  reference: z.string().optional(),
});

export const createPaymentSchema = z.object({
  invoiceId: z.string(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export const createTicketSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  subject: z.string().min(1),
  description: z.string().min(1),
});

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(2, "Branch code is required")
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens"),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateWarehouseSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignWarehouseStaffSchema = z.object({
  userId: z.string().min(1, "Staff member is required"),
  isManager: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AssignShipmentInput = z.infer<typeof assignShipmentSchema>;
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type AssignWarehouseStaffInput = z.infer<typeof assignWarehouseStaffSchema>;
