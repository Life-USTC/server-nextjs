import {
  acquireDirectoryLock,
  DEFAULT_LOCK_ROOT,
  releaseDirectoryLock,
  withDirectoryLock,
} from "../../../tools/shared/directory-lock";

export const LOCK_ROOT = DEFAULT_LOCK_ROOT;
export const DEBUG_USER_SUBSCRIPTIONS_LOCK = "debug-user-subscriptions";
const DEFAULT_LOCK_TIMEOUT_MS = 300_000;

type E2eLockOptions = {
  retryMs?: number;
  timeoutMs?: number;
};

export async function acquireE2eLock(
  name: string,
  options: E2eLockOptions = {},
) {
  return acquireDirectoryLock(name, {
    retryMs: options.retryMs,
    timeoutMs: options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    timeoutLabel: "E2E lock",
  });
}

export async function releaseE2eLock(name: string) {
  await releaseDirectoryLock(name);
}

export async function withE2eLock<T>(
  name: string,
  callback: () => Promise<T>,
  options: E2eLockOptions = {},
): Promise<T> {
  return withDirectoryLock(name, callback, {
    retryMs: options.retryMs,
    timeoutMs: options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    timeoutLabel: "E2E lock",
  });
}
