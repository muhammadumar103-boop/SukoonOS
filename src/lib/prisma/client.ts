import { PrismaClient } from "@prisma/client";
import { isDemoMode } from "@/config/runtime";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma() {
  if (isDemoMode) {
    throw new Error("Prisma is not available in local demo mode.");
  }

  const client = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    return getPrisma()[property as keyof PrismaClient];
  },
});
