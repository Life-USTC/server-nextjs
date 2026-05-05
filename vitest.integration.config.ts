import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

function loadDotEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(".env", "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => {
          const idx = l.indexOf("=");
          const key = l.slice(0, idx).trim();
          // Strip surrounding quotes from the value
          const raw = l.slice(idx + 1).trim();
          const value = raw.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
          return [key, value] as [string, string];
        }),
    );
  } catch {
    return {};
  }
}

/**
 * Integration test config — runs tests that require a live database connection.
 * Make sure the dev seed has been applied before running:
 *   bun run dev:seed
 *
 * Run with:
 *   bun run test:integration
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Inject .env variables so the tests can reach the database without the
    // caller having to export them manually.
    env: loadDotEnv(),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@coss/ui/base-ui": path.resolve(__dirname, "src/lib/coss-base-ui"),
      "@tools": path.resolve(__dirname, "tools"),
    },
  },
});
