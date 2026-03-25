import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://localhost:${playwrightPort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/test.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"]] : [["list"]],
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry",
    screenshot: "on",
  },
  webServer: {
    command: `node -e "require('fs').writeFileSync('.e2e-mock-s3','1')" && bun run build && AUTH_TRUST_HOST=true AUTH_URL="${playwrightBaseUrl}" BETTER_AUTH_URL="${playwrightBaseUrl}" NEXTAUTH_URL="${playwrightBaseUrl}" E2E_DEBUG_AUTH=1 E2E_MOCK_S3=1 DEV_DEBUG_PASSWORD=e2e-debug-local-only DEV_ADMIN_PASSWORD=e2e-admin-local-only bunx next start --hostname localhost --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 300 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
