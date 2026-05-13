import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export const DEFAULT_LOCK_ROOT = join(process.cwd(), ".tmp", "e2e-locks");
const DEFAULT_LOCK_RETRY_MS = 100;

type DirectoryLockOptions = {
  retryMs?: number;
  timeoutMs: number;
  timeoutLabel: string;
  root?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errnoCode(error: unknown) {
  return (error as NodeJS.ErrnoException | null)?.code;
}

async function waitForDirectoryLock(
  name: string,
  options: DirectoryLockOptions,
) {
  const retryMs = options.retryMs ?? DEFAULT_LOCK_RETRY_MS;
  const root = options.root ?? DEFAULT_LOCK_ROOT;
  const lockPath = join(root, name);
  const deadline = Date.now() + options.timeoutMs;

  await mkdir(root, { recursive: true });

  while (true) {
    try {
      await mkdir(lockPath);
      return lockPath;
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

      if (Date.now() - lockStats.mtimeMs >= options.timeoutMs) {
        await rm(lockPath, { recursive: true, force: true });
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting for ${options.timeoutLabel}: ${name}`,
        );
      }

      await delay(retryMs);
    }
  }
}

export async function acquireDirectoryLock(
  name: string,
  options: DirectoryLockOptions,
) {
  const lockPath = await waitForDirectoryLock(name, options);
  return async () => {
    await rm(lockPath, { recursive: true, force: true });
  };
}

export async function releaseDirectoryLock(
  name: string,
  root = DEFAULT_LOCK_ROOT,
) {
  await rm(join(root, name), { recursive: true, force: true });
}

export async function withDirectoryLock<T>(
  name: string,
  callback: () => Promise<T>,
  options: DirectoryLockOptions,
): Promise<T> {
  const release = await acquireDirectoryLock(name, options);

  try {
    return await callback();
  } finally {
    await release();
  }
}
