import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import "dotenv/config";

export default async function globalSetup(_: FullConfig) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for e2e global setup");
  }

  execSync("bun run dev:seed-scenarios", {
    stdio: "inherit",
    env: process.env,
  });
}
