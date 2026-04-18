/**
 * Clears active suspensions for the dev debug user so E2E runs stay idempotent.
 * Run after seed (global setup) and safe to run multiple times.
 */
import { createToolPrisma } from "../../shared/tool-prisma";

const prisma = createToolPrisma();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { username: "dev-admin" },
    select: { id: true },
  });
  const debug = await prisma.user.findFirst({
    where: { username: "dev-user" },
    select: { id: true },
  });
  if (!admin?.id || !debug?.id) {
    return;
  }

  const result = await prisma.userSuspension.updateMany({
    where: {
      userId: debug.id,
      liftedAt: null,
    },
    data: {
      liftedAt: new Date(),
      liftedById: admin.id,
    },
  });

  if (result.count > 0) {
    console.log(
      `[e2e] Lifted ${result.count} active suspension(s) for dev-user`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("[e2e] clear-e2e-suspensions failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
