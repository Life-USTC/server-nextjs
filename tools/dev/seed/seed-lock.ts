import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const LOCK_ROOT = join(process.cwd(), ".tmp", "e2e-locks");
const LOCK_RETRY_MS = 100;
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errnoCode(error: unknown) {
  return (error as NodeJS.ErrnoException | null)?.code;
}

export async function withSeedLock<T>(
  name: string,
  callback: () => Promise<T>,
): Promise<T> {
  await mkdir(LOCK_ROOT, { recursive: true });
  const lockPath = join(LOCK_ROOT, name);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if (errnoCode(error) !== "EEXIST") {
        throw error;
      }

      let lockStats: Awaited<ReturnType<typeof stat>>;
      try {
        lockStats = await stat(lockPath);
      } catch (statError) {
        if (errnoCode(statError) === "ENOENT") {
          continue;
        }
        throw statError;
      }

      if (Date.now() - lockStats.mtimeMs >= LOCK_TIMEOUT_MS) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for seed lock: ${name}`);
      }

      await delay(LOCK_RETRY_MS);
    }
  }

  try {
    return await callback();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}
