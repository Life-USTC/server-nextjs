import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
const playwrightNoProxy = "127.0.0.1,localhost,::1";
const mockS3Endpoint =
  process.env.E2E_MOCK_S3_ENDPOINT ?? "http://127.0.0.1:4569";

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

function isConfiguredEnvValue(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    !/^replace-with-/i.test(trimmed) &&
    !/^your-/i.test(trimmed)
  );
}

function hasUsableS3UploadConfig() {
  return (
    isConfiguredEnvValue(process.env.S3_BUCKET) &&
    isConfiguredEnvValue(process.env.AWS_REGION) &&
    isConfiguredEnvValue(process.env.AWS_ACCESS_KEY_ID) &&
    isConfiguredEnvValue(process.env.AWS_SECRET_ACCESS_KEY)
  );
}

if (process.env.E2E_USE_MOCK_S3 === "1" || !hasUsableS3UploadConfig()) {
  process.env.E2E_MOCK_S3_ENDPOINT = mockS3Endpoint;
  process.env.S3_BUCKET = process.env.S3_BUCKET ?? "life-ustc-e2e";
  process.env.AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
  process.env.AWS_ACCESS_KEY_ID =
    process.env.AWS_ACCESS_KEY_ID ?? "e2e-access-key";
  process.env.AWS_SECRET_ACCESS_KEY =
    process.env.AWS_SECRET_ACCESS_KEY ?? "e2e-secret-key";
  process.env.AWS_ENDPOINT_URL_S3 =
    process.env.AWS_ENDPOINT_URL_S3 ?? mockS3Endpoint;
}

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
    command:
      "bun run build && bun run test:e2e:prepare-server && bun .next/standalone/server.js",
    env: {
      ...process.env,
      HOSTNAME: playwrightHost,
      PORT: playwrightPort,
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
