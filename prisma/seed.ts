import {
  PrismaClient,
  UserRole,
  UserStatus,
  ShipmentType,
  ShipmentStatus,
  InventoryCategory,
  VehicleType,
  VehicleStatus,
  DriverStatus,
  InvoiceStatus,
  PaymentMethod,
  TicketCategory,
  TicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const demoUserUpdate = { passwordHash, status: UserStatus.ACTIVE };

  const admin = await db.user.upsert({
    where: { email: "admin@oshus.com" },
    update: demoUserUpdate,
    create: {
      firstName: "System",
      lastName: "Admin",
      email: "admin@oshus.com",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const dispatcher = await db.user.upsert({
    where: { email: "dispatcher@oshus.com" },
    update: demoUserUpdate,
    create: {
      firstName: "James",
      lastName: "Wilson",
      email: "dispatcher@oshus.com",
      passwordHash,
      role: UserRole.DISPATCHER,
      status: UserStatus.ACTIVE,
    },
  });

  const warehouseUser = await db.user.upsert({
    where: { email: "warehouse@oshus.com" },
    update: demoUserUpdate,
    create: {
      firstName: "Sarah",
      lastName: "Chen",
      email: "warehouse@oshus.com",
      passwordHash,
      role: UserRole.WAREHOUSE_STAFF,
      status: UserStatus.ACTIVE,
    },
  });

  const financeUser = await db.user.upsert({
    where: { email: "finance@oshus.com" },
    update: demoUserUpdate,
    create: {
      firstName: "Michael",
      lastName: "Brown",
      email: "finance@oshus.com",
      passwordHash,
      role: UserRole.FINANCE_OFFICER,
      status: UserStatus.ACTIVE,
    },
  });

  const driverUser = await db.user.upsert({
    where: { email: "driver@oshus.com" },
    update: demoUserUpdate,
    create: {
      firstName: "David",
      lastName: "Martinez",
      email: "driver@oshus.com",
      passwordHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  const customerUser = await db.user.upsert({
    where: { email: "customer@acme.com" },
    update: demoUserUpdate,
    create: {
      firstName: "John",
      lastName: "Acme",
      email: "customer@acme.com",
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
  });

  const customer = await db.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      companyName: "Acme Corporation",
      contactPerson: "John Acme",
      phone: "+1-555-0100",
      address: "123 Business Ave, New York, NY 10001",
    },
  });

  const warehouse = await db.warehouse.upsert({
    where: { id: "seed-warehouse-1" },
    update: {
      code: "WH-NJ-01",
      city: "Newark",
      phone: "+1-555-0200",
      isActive: true,
      managerId: warehouseUser.id,
    },
    create: {
      id: "seed-warehouse-1",
      code: "WH-NJ-01",
      name: "Main Distribution Center",
      address: "456 Logistics Blvd, Newark, NJ 07102",
      city: "Newark",
      phone: "+1-555-0200",
      managerId: warehouseUser.id,
    },
  });

  const warehouse2 = await db.warehouse.upsert({
    where: { id: "seed-warehouse-2" },
    update: {
      code: "WH-LA-01",
      city: "Los Angeles",
      phone: "+1-555-0300",
      isActive: true,
    },
    create: {
      id: "seed-warehouse-2",
      code: "WH-LA-01",
      name: "West Coast Hub",
      address: "789 Freight Way, Los Angeles, CA 90001",
      city: "Los Angeles",
      phone: "+1-555-0300",
    },
  });

  await db.warehouseAssignment.upsert({
    where: {
      userId_warehouseId: {
        userId: warehouseUser.id,
        warehouseId: warehouse.id,
      },
    },
    update: { isManager: true },
    create: {
      userId: warehouseUser.id,
      warehouseId: warehouse.id,
      isManager: true,
    },
  });

  const zone = await db.zone.create({
    data: { warehouseId: warehouse.id, name: "Zone A", code: "ZA" },
  });

  const rack = await db.rack.create({
    data: { zoneId: zone.id, name: "Rack 1", code: "R1" },
  });

  const shelf = await db.shelf.create({
    data: { rackId: rack.id, name: "Shelf 1", code: "S1" },
  });

  const bin = await db.bin.create({
    data: { shelfId: shelf.id, name: "Bin 1", code: "B1" },
  });

  await db.inventoryItem.createMany({
    data: [
      {
        warehouseId: warehouse.id,
        binId: bin.id,
        sku: "PKG-001",
        productName: "Standard Shipping Box (Medium)",
        category: InventoryCategory.PACKAGING_MATERIALS,
        quantity: 500,
        unitCost: 2.5,
        reorderLevel: 100,
      },
      {
        warehouseId: warehouse.id,
        sku: "GDS-001",
        productName: "Electronics Components",
        category: InventoryCategory.GOODS,
        quantity: 8,
        unitCost: 150.0,
        reorderLevel: 20,
      },
      {
        warehouseId: warehouse2.id,
        sku: "PKG-002",
        productName: "Standard Shipping Box (Large)",
        category: InventoryCategory.PACKAGING_MATERIALS,
        quantity: 300,
        unitCost: 3.5,
        reorderLevel: 75,
      },
      {
        warehouseId: warehouse2.id,
        sku: "GDS-002",
        productName: "Consumer Electronics",
        category: InventoryCategory.GOODS,
        quantity: 45,
        unitCost: 220.0,
        reorderLevel: 15,
      },
    ],
    skipDuplicates: true,
  });

  const vehicle = await db.vehicle.upsert({
    where: { plateNumber: "OSH-4521" },
    update: {},
    create: {
      plateNumber: "OSH-4521",
      type: VehicleType.TRUCK,
      capacity: 5000,
      status: VehicleStatus.AVAILABLE,
    },
  });

  await db.vehicle.createMany({
    data: [
      { plateNumber: "OSH-7832", type: VehicleType.VAN, capacity: 1500, status: VehicleStatus.IN_USE },
      { plateNumber: "OSH-1190", type: VehicleType.MOTORCYCLE, capacity: 50, status: VehicleStatus.AVAILABLE },
    ],
    skipDuplicates: true,
  });

  const driver = await db.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: "DL-NY-789456",
      status: DriverStatus.AVAILABLE,
      vehicleId: vehicle.id,
    },
  });

  await db.shipment.updateMany({
    where: { trackingNumber: "OSH-M2K9F8-A3B7" },
    data: { warehouseId: warehouse.id },
  });
  await db.shipment.updateMany({
    where: { trackingNumber: "OSH-M2K9G1-C4D8" },
    data: { warehouseId: warehouse2.id },
  });

  const shipment1 = await db.shipment.create({
    data: {
      trackingNumber: "OSH-M2K9F8-A3B7",
      customerId: customer.id,
      warehouseId: warehouse.id,
      shipmentType: ShipmentType.EXPRESS,
      weight: 25.5,
      origin: "New York, NY",
      destination: "Los Angeles, CA",
      status: ShipmentStatus.IN_TRANSIT,
      driverId: driver.id,
      vehicleId: vehicle.id,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: ShipmentStatus.DRAFT, location: "New York, NY", notes: "Shipment created" },
          { eventType: ShipmentStatus.SCHEDULED, location: "New York, NY", notes: "Pickup scheduled" },
          { eventType: ShipmentStatus.PICKED_UP, location: "New York, NY", notes: "Package picked up" },
          { eventType: ShipmentStatus.IN_TRANSIT, location: "Chicago, IL", notes: "In transit via hub" },
        ],
      },
      trackingUpdates: {
        create: [
          { latitude: 40.7128, longitude: -74.006, location: "New York, NY" },
          { latitude: 41.8781, longitude: -87.6298, location: "Chicago, IL" },
        ],
      },
    },
  });

  await db.shipment.create({
    data: {
      trackingNumber: "OSH-M2K9G1-C4D8",
      customerId: customer.id,
      warehouseId: warehouse2.id,
      shipmentType: ShipmentType.STANDARD,
      weight: 12.0,
      origin: "Boston, MA",
      destination: "Miami, FL",
      status: ShipmentStatus.DELIVERED,
      actualDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      events: {
        create: [
          { eventType: ShipmentStatus.DRAFT, location: "Boston, MA" },
          { eventType: ShipmentStatus.DELIVERED, location: "Miami, FL", notes: "Delivered successfully" },
        ],
      },
    },
  });

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: "INV-2026-00001",
      customerId: customer.id,
      shipmentId: shipment1.id,
      serviceType: "Express Shipping",
      amount: 450.0,
      tax: 45.0,
      totalAmount: 495.0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: InvoiceStatus.SENT,
    },
  });

  await db.invoice.create({
    data: {
      invoiceNumber: "INV-2026-00002",
      customerId: customer.id,
      serviceType: "Warehousing",
      amount: 1200.0,
      tax: 120.0,
      totalAmount: 1320.0,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: InvoiceStatus.PAID,
      payments: {
        create: {
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          amount: 1320.0,
          reference: "TXN-2026-001",
        },
      },
    },
  });

  await db.supportTicket.create({
    data: {
      customerId: customer.id,
      createdById: customerUser.id,
      assigneeId: admin.id,
      category: TicketCategory.SHIPMENT_DELAY,
      status: TicketStatus.IN_PROGRESS,
      subject: "Delayed express shipment",
      description: "Shipment OSH-M2K9F8-A3B7 appears to be delayed past estimated delivery date.",
    },
  });

  await db.auditLog.createMany({
    data: [
      { userId: admin.id, action: "CREATE", entity: "System", entityId: "seed", details: "Database seeded" },
      { userId: dispatcher.id, action: "CREATE", entity: "Shipment", entityId: shipment1.id, details: "Assigned driver to shipment" },
    ],
  });

  console.log("Seed completed!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  Admin:      admin@oshus.com");
  console.log("  Customer:   customer@acme.com");
  console.log("  Dispatcher: dispatcher@oshus.com");
  console.log("  Warehouse:  warehouse@oshus.com");
  console.log("  Driver:     driver@oshus.com");
  console.log("  Finance:    finance@oshus.com");
  console.log("\nTrack shipment: OSH-M2K9F8-A3B7");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
