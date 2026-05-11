import { defineConfig, devices } from "@playwright/test";

const PLAYWRIGHT_NO_PROXY = "127.0.0.1,localhost,::1";
const DEFAULT_WEB_SERVER_TIMEOUT_MS = 300 * 1000;
const DEFAULT_MINIO_ENDPOINT = "http://127.0.0.1:9000";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;
const reuseExistingServer =
  process.env.PLAYWRIGHT_REUSE_SERVER === "1" ||
  (process.env.PLAYWRIGHT_REUSE_SERVER !== "0" && !process.env.CI);

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredValue(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed && !/^replace-with-/i.test(trimmed) && !/^your-/i.test(trimmed)
    ? trimmed
    : undefined;
}

function appendNoProxy(value: string | undefined) {
  return value ? `${value},${PLAYWRIGHT_NO_PROXY}` : PLAYWRIGHT_NO_PROXY;
}

const playwrightRetries = Number.parseInt(
  process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? "2" : "0"),
  10,
);
const playwrightWebServerTimeoutMs = Number.parseInt(
  process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ??
    `${DEFAULT_WEB_SERVER_TIMEOUT_MS}`,
  10,
);
const defaultPlaywrightWorkers = process.env.CI ? 4 : 4;
const playwrightWorkers = parsePositiveInteger(
  process.env.PLAYWRIGHT_WORKERS,
  defaultPlaywrightWorkers,
);
const awsRegion =
  configuredValue(process.env.AWS_REGION) ??
  configuredValue(process.env.AWS_DEFAULT_REGION) ??
  "us-east-1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/test.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  outputDir: "test-results/e2e",
  fullyParallel: process.env.PLAYWRIGHT_FULLY_PARALLEL === "1",
  forbidOnly: Boolean(process.env.CI),
  retries: Number.isNaN(playwrightRetries) ? 0 : playwrightRetries,
  workers: Number.isNaN(playwrightWorkers) ? 1 : playwrightWorkers,
  reporter: process.env.CI ? [["github"]] : [["list"]],
  use: {
    baseURL: playwrightBaseUrl,
    trace: process.env.E2E_TRANSPARENCY === "1" ? "on" : "on-first-retry",
    screenshot: process.env.E2E_TRANSPARENCY === "1" ? "on" : "only-on-failure",
  },
  webServer: {
    command:
      "bun run build && bun run test:e2e:prepare-server && bun .next/standalone/server.js",
    env: {
      ...process.env,
      HOSTNAME: playwrightHost,
      PORT: playwrightPort,
      NO_PROXY: appendNoProxy(process.env.NO_PROXY),
      no_proxy: appendNoProxy(process.env.no_proxy),
      APP_PUBLIC_ORIGIN: playwrightBaseUrl,
      AUTH_TRUST_HOST: "true",
      AUTH_URL: playwrightBaseUrl,
      BETTER_AUTH_URL: playwrightBaseUrl,
      NEXTAUTH_URL: playwrightBaseUrl,
      E2E_DEBUG_AUTH: "1",
      DEV_DEBUG_USERNAME: process.env.DEV_DEBUG_USERNAME ?? "liuyang",
      DEV_DEBUG_NAME: process.env.DEV_DEBUG_NAME ?? "刘洋",
      DEV_DEBUG_PASSWORD:
        process.env.DEV_DEBUG_PASSWORD ?? "e2e-debug-local-only",
      DEV_ADMIN_USERNAME: process.env.DEV_ADMIN_USERNAME ?? "dev-admin",
      DEV_ADMIN_NAME: process.env.DEV_ADMIN_NAME ?? "校园管理员",
      DEV_ADMIN_PASSWORD:
        process.env.DEV_ADMIN_PASSWORD ?? "e2e-admin-local-only",
      S3_BUCKET: configuredValue(process.env.S3_BUCKET) ?? "life-ustc-e2e",
      AWS_REGION: awsRegion,
      AWS_DEFAULT_REGION: awsRegion,
      AWS_ACCESS_KEY_ID:
        configuredValue(process.env.AWS_ACCESS_KEY_ID) ?? "minioadmin",
      AWS_SECRET_ACCESS_KEY:
        configuredValue(process.env.AWS_SECRET_ACCESS_KEY) ?? "minioadmin",
      AWS_ENDPOINT_URL_S3:
        configuredValue(process.env.AWS_ENDPOINT_URL_S3) ??
        DEFAULT_MINIO_ENDPOINT,
    },
    url: playwrightBaseUrl,
    reuseExistingServer,
    stdout: "ignore",
    stderr: "pipe",
    timeout: Number.isNaN(playwrightWebServerTimeoutMs)
      ? DEFAULT_WEB_SERVER_TIMEOUT_MS
      : playwrightWebServerTimeoutMs,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
