import "dotenv/config";

import { PrismaClient } from "../../src/generated/prisma/client";
import { createPrismaAdapter } from "../../src/lib/db/prisma-adapter";

export type ToolPrismaClient = PrismaClient;

export function createToolPrisma() {
  return new PrismaClient({
    adapter: createPrismaAdapter(),
    transactionOptions: {
      maxWait: 10_000,
      timeout: 60_000,
    },
  });
}

export async function disconnectToolPrisma(prisma: ToolPrismaClient) {
  await prisma.$disconnect();
}
