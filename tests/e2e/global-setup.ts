import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import "dotenv/config";
import { startS3Server } from "./utils/s3-server";

export default async function globalSetup(_: FullConfig) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for e2e global setup");
  }

  const s3Config = await startS3Server();
  process.env.S3_ENDPOINT = s3Config.endpoint;
  process.env.S3_BUCKET = s3Config.bucket;
  process.env.S3_ACCESS_KEY_ID = s3Config.accessKeyId;
  process.env.S3_SECRET_ACCESS_KEY = s3Config.secretAccessKey;
  process.env.S3_REGION = s3Config.region;
  process.env.S3_FORCE_PATH_STYLE = "true";

  execSync("bun run dev:seed-scenarios", {
    stdio: "inherit",
    env: process.env,
  });

  execSync("bun run tools/clear-e2e-suspensions.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
