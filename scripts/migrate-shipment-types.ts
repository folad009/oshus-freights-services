import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ShipmentType" ADD VALUE IF NOT EXISTS 'STANDARD_AIR_FREIGHT'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ShipmentType" ADD VALUE IF NOT EXISTS 'STANDARD_SEA_FREIGHT'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ShipmentType" ADD VALUE IF NOT EXISTS 'EXPRESS'`
  );

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'STANDARD_AIR_FREIGHT'
    WHERE "shipmentType"::text = 'STANDARD'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'STANDARD_SEA_FREIGHT'
    WHERE "shipmentType"::text = 'FREIGHT'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'EXPRESS'
    WHERE "shipmentType"::text = 'INTERNATIONAL'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'STANDARD_SEA_FREIGHT'
    WHERE "shipmentType"::text = 'BULK_CARGO'
  `);

  console.log("Shipment type values migrated.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
