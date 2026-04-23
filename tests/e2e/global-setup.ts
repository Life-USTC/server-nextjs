import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import "dotenv/config";
import { startMockS3Server } from "./utils/mock-s3-server";

export default async function globalSetup(_: FullConfig) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for e2e global setup");
  }

  await startMockS3Server();

  execSync("bun run dev:seed-scenarios", {
    stdio: "inherit",
    env: process.env,
  });
}
