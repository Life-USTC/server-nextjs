import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export const LOCK_ROOT = join(process.cwd(), ".tmp", "e2e-locks");
const DEFAULT_LOCK_RETRY_MS = 100;
const DEFAULT_LOCK_TIMEOUT_MS = 300_000;

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errnoCode(error: unknown) {
  return (error as NodeJS.ErrnoException | null)?.code;
}

type E2eLockOptions = {
  retryMs?: number;
  timeoutMs?: number;
};

async function waitForLock(name: string, options: E2eLockOptions = {}) {
  const retryMs = options.retryMs ?? DEFAULT_LOCK_RETRY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;

  await mkdir(LOCK_ROOT, { recursive: true });
  const lockPath = join(LOCK_ROOT, name);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      await mkdir(lockPath);
      return lockPath;
    } catch (error) {
      if (errnoCode(error) !== "EEXIST") {
        throw error;
      }
      let lockStats: Awaited<ReturnType<typeof stat>> | null;
      try {
        lockStats = await stat(lockPath);
      } catch (statError) {
        // The lock disappeared between mkdir EEXIST and stat → retry mkdir.
        if (errnoCode(statError) === "ENOENT") continue;
        throw statError;
      }
      if (Date.now() - lockStats.mtimeMs >= timeoutMs) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for E2E lock: ${name}`);
      }
      await delay(retryMs);
    }
  }
}

export async function acquireE2eLock(
  name: string,
  options: E2eLockOptions = {},
) {
  const lockPath = await waitForLock(name, options);
  return async () => {
    await rm(lockPath, { recursive: true, force: true });
  };
}

export async function releaseE2eLock(name: string) {
  await rm(join(LOCK_ROOT, name), { recursive: true, force: true });
}

export async function withE2eLock<T>(
  name: string,
  callback: () => Promise<T>,
  options: E2eLockOptions = {},
): Promise<T> {
  const release = await acquireE2eLock(name, options);

  try {
    return await callback();
  } finally {
    await release();
  }
}
