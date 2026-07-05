import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ShipmentType" ADD VALUE IF NOT EXISTS 'STANDARD_AIR_FREIGHT'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ShipmentType" ADD VALUE IF NOT EXISTS 'STANDARD_SEA_FREIGHT'`
  );

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'STANDARD_AIR_FREIGHT'
    WHERE "shipmentType"::text IN ('STANDARD', 'EXPRESS')
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Shipment"
    SET "shipmentType" = 'STANDARD_SEA_FREIGHT'
    WHERE "shipmentType"::text = 'FREIGHT'
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
