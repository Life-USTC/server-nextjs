import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

export function createBetterAuthPrismaAdapter(prisma: PrismaClient) {
  return prismaAdapter(prisma, {
    provider: "postgresql",
  });
}
