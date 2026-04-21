import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
const playwrightNoProxy = "127.0.0.1,localhost,::1";

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const playwrightRetries = Number.parseInt(
  process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? "2" : "0"),
  10,
);
const playwrightWebServerTimeoutMs = Number.parseInt(
  process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? `${300 * 1000}`,
  10,
);
const defaultPlaywrightWorkers = process.env.CI ? 4 : 2;
const playwrightWorkers = parsePositiveInteger(
  process.env.PLAYWRIGHT_WORKERS,
  defaultPlaywrightWorkers,
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/test.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: process.env.PLAYWRIGHT_FULLY_PARALLEL === "1",
  forbidOnly: Boolean(process.env.CI),
  retries: Number.isNaN(playwrightRetries) ? 0 : playwrightRetries,
  workers: Number.isNaN(playwrightWorkers) ? 1 : playwrightWorkers,
  reporter: process.env.CI ? [["github"]] : [["list"]],
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `bun run build && bunx next start --hostname ${playwrightHost} --port ${playwrightPort}`,
    env: {
      ...process.env,
      NO_PROXY: process.env.NO_PROXY
        ? `${process.env.NO_PROXY},${playwrightNoProxy}`
        : playwrightNoProxy,
      no_proxy: process.env.no_proxy
        ? `${process.env.no_proxy},${playwrightNoProxy}`
        : playwrightNoProxy,
      APP_PUBLIC_ORIGIN: playwrightBaseUrl,
      AUTH_TRUST_HOST: "true",
      AUTH_URL: playwrightBaseUrl,
      BETTER_AUTH_URL: playwrightBaseUrl,
      NEXTAUTH_URL: playwrightBaseUrl,
      E2E_DEBUG_AUTH: "1",
      DEV_DEBUG_PASSWORD: "e2e-debug-local-only",
      DEV_ADMIN_PASSWORD: "e2e-admin-local-only",
    },
    url: playwrightBaseUrl,
    reuseExistingServer,
    stdout: "ignore",
    stderr: "pipe",
    timeout: Number.isNaN(playwrightWebServerTimeoutMs)
      ? 300 * 1000
      : playwrightWebServerTimeoutMs,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
