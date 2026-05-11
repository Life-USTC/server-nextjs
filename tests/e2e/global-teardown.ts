import type { FullConfig } from "@playwright/test";
import { releaseE2eLock } from "./utils/locks";

const GLOBAL_RUN_LOCK = "playwright-global-run";

export default async function globalTeardown(_: FullConfig) {
  await releaseE2eLock(GLOBAL_RUN_LOCK);
}
