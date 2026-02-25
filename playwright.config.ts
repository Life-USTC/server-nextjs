import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/test.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"]] : [["list"]],
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry",
    screenshot: "on",
  },
  webServer: {
    command: `node -e "require('fs').writeFileSync('.e2e-mock-s3','1')" && bun run dev -- --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
