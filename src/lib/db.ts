import { PrismaClient } from "@prisma/client";

/** Bump when schema changes require a fresh client in local dev (HMR cache). */
const PRISMA_SCHEMA_VERSION = 5;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  const cacheValid =
    cached &&
    (process.env.NODE_ENV === "production" ||
      globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION);

  if (cacheValid) return cached;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }
  return client;
}

export const db = getPrismaClient();
