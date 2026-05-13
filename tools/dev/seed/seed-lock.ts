import { withDirectoryLock } from "../../shared/directory-lock";

const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

export async function withSeedLock<T>(
  name: string,
  callback: () => Promise<T>,
): Promise<T> {
  return withDirectoryLock(name, callback, {
    timeoutMs: LOCK_TIMEOUT_MS,
    timeoutLabel: "seed lock",
  });
}
