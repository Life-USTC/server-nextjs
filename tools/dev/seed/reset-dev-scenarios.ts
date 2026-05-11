import {
  createToolPrisma,
  disconnectToolPrisma,
} from "../../shared/tool-prisma";
import { cleanupDevScenarioData } from "./dev-scenario-cleanup";
import { getDevScenarioRuntimeConfig } from "./dev-seed";
import { withSeedLock } from "./seed-lock";

const prisma = createToolPrisma();
const { debugUsername, adminUsername } = getDevScenarioRuntimeConfig();

async function main() {
  const users = await prisma.user.findMany({
    where: { username: { in: [debugUsername, adminUsername] } },
    select: { id: true, username: true },
  });

  await cleanupDevScenarioData(
    prisma,
    users.map((user) => user.id),
    {
      removeCatalogMetadata: true,
      userSuspensions: "byMarker",
    },
  );

  console.log("开发调试场景数据清理完成");
  console.log(`已处理用户数: ${users.length}`);
}

withSeedLock("dev-seed-scenarios", main)
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("开发调试场景数据清理失败", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectToolPrisma(prisma);
  });
