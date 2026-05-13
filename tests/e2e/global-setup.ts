import type { FullConfig } from "@playwright/test";
import "dotenv/config";
import { bootstrapPlaywrightData } from "../../tools/dev/util/playwright-runtime";
import { acquireE2eLock } from "./utils/locks";

const GLOBAL_RUN_LOCK = "playwright-global-run";
const GLOBAL_RUN_LOCK_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export default async function globalSetup(_: FullConfig) {
  const releaseRunLock = await acquireE2eLock(GLOBAL_RUN_LOCK, {
    timeoutMs: GLOBAL_RUN_LOCK_TIMEOUT_MS,
  });

  try {
    await bootstrapPlaywrightData(process.env);
  } catch (error) {
    await releaseRunLock();
    throw error;
  }
}
