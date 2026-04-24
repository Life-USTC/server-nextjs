import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const LOCK_ROOT = join(process.cwd(), ".tmp", "e2e-locks");
const LOCK_RETRY_MS = 100;
const LOCK_TIMEOUT_MS = 30_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withE2eLock<T>(
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
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code !== "EEXIST") {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for E2E lock: ${name}`);
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
