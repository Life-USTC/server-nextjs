import { defineConfig, devices } from "@playwright/test";
import {
  buildPlaywrightServerEnv,
  resolvePlaywrightHarnessRuntime,
} from "./tools/dev/util/playwright-runtime";

const playwrightRuntime = resolvePlaywrightHarnessRuntime();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/test.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  outputDir: "test-results/e2e",
  fullyParallel: playwrightRuntime.fullyParallel,
  forbidOnly: playwrightRuntime.forbidOnly,
  retries: playwrightRuntime.retries,
  workers: playwrightRuntime.workers,
  reporter: playwrightRuntime.reporter,
  use: {
    baseURL: playwrightRuntime.baseUrl,
    trace: playwrightRuntime.trace,
    screenshot: playwrightRuntime.screenshot,
  },
  webServer: {
    command: "bun run test:e2e:server",
    env: buildPlaywrightServerEnv({
      host: playwrightRuntime.host,
      port: playwrightRuntime.port,
      baseUrl: playwrightRuntime.baseUrl,
    }),
    url: playwrightRuntime.baseUrl,
    reuseExistingServer: playwrightRuntime.reuseExistingServer,
    stdout: "ignore",
    stderr: "pipe",
    // The dedicated Playwright bootstrap owns build-time staging and server startup.
    timeout: playwrightRuntime.webServerTimeoutMs,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
