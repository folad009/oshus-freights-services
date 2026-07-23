import { z } from "zod";
import {
  ShipmentType,
  ShipmentStatus,
  InventoryCategory,
  VehicleType,
  VehicleStatus,
  InvoiceStatus,
  PaymentMethod,
  TicketCategory,
  UserRole,
  GovernmentIdType,
  UserStatus,
} from "@/types/enums";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createUserSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.nativeEnum(UserRole),
    licenseNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.CUSTOMER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Create customer accounts from the Customers page",
        path: ["role"],
      });
    }
    if (data.role === UserRole.DRIVER && !data.licenseNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "License number is required for drivers",
        path: ["licenseNumber"],
      });
    }
  });

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    role: z.nativeEnum(UserRole),
    status: z.nativeEnum(UserStatus),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional()
      .or(z.literal("")),
    licenseNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === UserRole.DRIVER && !data.licenseNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "License number is required for drivers",
        path: ["licenseNumber"],
      });
    }
  });

export const customerProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createCustomerSchema = customerProfileSchema.extend({
  idDocumentType: z.nativeEnum(GovernmentIdType),
  idDocumentNumber: z.string().min(1, "ID number is required"),
  idDocumentStorageKey: z.string().min(1, "Government ID document is required"),
});

export const updateCustomerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email"),
});

function emptyNumberToUndefined(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  return value;
}

function emptyNumberToUndefinedOrNull(value: unknown) {
  if (value === null) return null;
  return emptyNumberToUndefined(value);
}

const optionalPositiveNumber = z.preprocess(
  emptyNumberToUndefined,
  z.number().positive().optional()
);

const optionalPositiveNullableNumber = z.preprocess(
  emptyNumberToUndefinedOrNull,
  z.number().positive().optional().nullable()
);

const requiredPositiveNumber = (requiredMessage: string, positiveMessage: string) =>
  z.preprocess(
    emptyNumberToUndefined,
    z.number({ message: requiredMessage }).positive(positiveMessage)
  );

const shipmentServiceRefinement = (
  data: {
    requestPickup?: boolean;
    requestDelivery?: boolean;
    pickupAddress?: string;
    deliveryAddress?: string;
    hasInsurance?: boolean;
    declaredValue?: number;
  },
  ctx: z.RefinementCtx
) => {
  if (data.requestPickup && !data.pickupAddress?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pickup address is required when door pickup is selected",
      path: ["pickupAddress"],
    });
  }
  if (data.requestDelivery && !data.deliveryAddress?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Delivery address is required when door delivery is selected",
      path: ["deliveryAddress"],
    });
  }
  if (data.hasInsurance && (data.declaredValue == null || data.declaredValue <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Declared value is required for insurance coverage",
      path: ["declaredValue"],
    });
  }
};

const shipmentPackageRefinement = (
  data: {
    weight?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  },
  ctx: z.RefinementCtx
) => {
  const hasLength = data.lengthCm != null && !Number.isNaN(data.lengthCm);
  const hasWidth = data.widthCm != null && !Number.isNaN(data.widthCm);
  const hasHeight = data.heightCm != null && !Number.isNaN(data.heightCm);
  const dimensionFields = [hasLength, hasWidth, hasHeight];
  const dimensionCount = dimensionFields.filter(Boolean).length;

  if (dimensionCount === 3) {
    if (data.lengthCm! <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Length must be greater than 0",
        path: ["lengthCm"],
      });
    }
    if (data.widthCm! <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Width must be greater than 0",
        path: ["widthCm"],
      });
    }
    if (data.heightCm! <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Height must be greater than 0",
        path: ["heightCm"],
      });
    }
    return;
  }

  if (dimensionCount > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter length, width, and height, or switch to weight only",
      path: ["lengthCm"],
    });
    return;
  }

  if (data.weight == null || Number.isNaN(data.weight) || data.weight <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Weight must be greater than 0",
      path: ["weight"],
    });
  }
};

const shipmentCoreFieldsSchema = z
  .object({
    shipmentType: z.nativeEnum(ShipmentType),
    weight: requiredPositiveNumber("Weight is required", "Weight must be greater than 0"),
    lengthCm: optionalPositiveNumber,
    widthCm: optionalPositiveNumber,
    heightCm: optionalPositiveNumber,
    packageCount: z.preprocess(
      emptyNumberToUndefined,
      z
        .number({ message: "Package count is required" })
        .int("Package count must be a whole number")
        .positive("Package count must be at least 1")
    ),
    origin: z.string().min(1, "Origin is required"),
    destination: z.string().min(1, "Destination is required"),
    scheduledPickup: z.string().optional(),
    notes: z.string().optional(),
    requestPickup: z.boolean().optional(),
    requestDelivery: z.boolean().optional(),
    pickupAddress: z.string().optional(),
    deliveryAddress: z.string().optional(),
    hasInsurance: z.boolean().optional(),
    declaredValue: optionalPositiveNumber,
    cbm: optionalPositiveNullableNumber,
  })
  .superRefine(shipmentPackageRefinement);

export const createShipmentSchema = shipmentCoreFieldsSchema
  .extend({
    customerId: z.string().optional(),
    warehouseId: z.string().optional(),
    acceptedTerms: z.boolean().optional(),
    idDocumentType: z.nativeEnum(GovernmentIdType).optional(),
    idDocumentNumber: z.string().min(1).optional(),
    idDocumentStorageKey: z.string().min(1).optional(),
  })
  .superRefine(shipmentServiceRefinement);

export const updateShipmentSchema = z.object({
  shipmentType: z.nativeEnum(ShipmentType).optional(),
  weight: z.number().positive().optional(),
  lengthCm: z.number().positive().optional().nullable(),
  widthCm: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  packageCount: z.number().int().positive().optional(),
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
  warehouseId: z.string().min(1, "Warehouse branch is required"),
  binId: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  productName: z.string().min(1, "Product name is required"),
  category: z.nativeEnum(InventoryCategory),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0),
  reorderLevel: z.number().int().min(0).optional(),
});

export const updateInventorySchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  category: z.nativeEnum(InventoryCategory),
  quantity: z.number().int().min(0),
  unitCost: z.number().min(0),
  reorderLevel: z.number().int().min(0),
  binId: z.string().optional().nullable(),
  adjustmentNotes: z.string().optional(),
});

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  type: z.nativeEnum(VehicleType),
  capacity: z.number().positive("Capacity must be greater than 0"),
});

export const updateVehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  type: z.nativeEnum(VehicleType),
  capacity: z.number().positive("Capacity must be greater than 0"),
  status: z.nativeEnum(VehicleStatus),
  fuelUsage: z.number().min(0).optional(),
  lastMaintenance: z.string().optional().nullable(),
  nextMaintenance: z.string().optional().nullable(),
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
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
});

export const staffCreateTicketSchema = createTicketSchema.extend({
  customerId: z.string().min(1, "Customer is required"),
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

export const createShipmentIntakeLinkSchema = z.object({
  warehouseId: z.string().optional(),
});

const shipmentIntakeCustomerFields = z.object({
  companyName: z.string().min(1, "Company or sender name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email address"),
});

export const submitShipmentIntakeSchema = shipmentIntakeCustomerFields
  .merge(
    shipmentCoreFieldsSchema.extend({
      acceptedTerms: z.boolean().refine((val) => val === true, {
        message: "You must accept the terms and conditions",
      }),
      idDocumentType: z.nativeEnum(GovernmentIdType),
      idDocumentNumber: z.string().min(1, "ID number is required"),
      idDocumentStorageKey: z.string().min(1, "Government ID document is required"),
    })
  )
  .superRefine(shipmentServiceRefinement);

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AssignShipmentInput = z.infer<typeof assignShipmentSchema>;
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type AssignWarehouseStaffInput = z.infer<typeof assignWarehouseStaffSchema>;
export type CreateShipmentIntakeLinkInput = z.infer<typeof createShipmentIntakeLinkSchema>;
export type SubmitShipmentIntakeInput = z.infer<typeof submitShipmentIntakeSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type StaffCreateTicketInput = z.infer<typeof staffCreateTicketSchema>;
