import { execSync } from "node:child_process";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FullConfig } from "@playwright/test";
import "dotenv/config";
import { acquireE2eLock, delay } from "./utils/locks";

const DEFAULT_MINIO_ENDPOINT = "http://127.0.0.1:9000";
const DEFAULT_E2E_BUCKET = "life-ustc-e2e";
const MINIO_PROVISION_ATTEMPTS = 15;
const MINIO_PROVISION_RETRY_MS = 500;

function configured(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^replace-with-/i.test(trimmed) || /^your-/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function isBucketMissingError(error: unknown) {
  if (!(error instanceof Error)) return false;
  // AWS SDK v3 surfaces "NotFound" for HeadBucket and "NoSuchBucket" for ops on
  // a missing bucket. MinIO follows the same name convention.
  return error.name === "NotFound" || error.name === "NoSuchBucket";
}

async function retry<T>(attempts: number, fn: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay(MINIO_PROVISION_RETRY_MS);
      }
    }
  }
  throw lastError;
}

async function provisionMinioBucket() {
  const endpoint =
    configured(process.env.AWS_ENDPOINT_URL_S3) ?? DEFAULT_MINIO_ENDPOINT;
  const bucket = configured(process.env.S3_BUCKET) ?? DEFAULT_E2E_BUCKET;

  const s3 = new S3Client({
    region: configured(process.env.AWS_REGION) ?? "us-east-1",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: configured(process.env.AWS_ACCESS_KEY_ID) ?? "minioadmin",
      secretAccessKey:
        configured(process.env.AWS_SECRET_ACCESS_KEY) ?? "minioadmin",
    },
  });

  await retry(MINIO_PROVISION_ATTEMPTS, async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      return;
    } catch (error) {
      if (!isBucketMissingError(error)) {
        throw error;
      }
    }
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  });

  const smokeKey = `e2e-smoke/${Date.now()}.txt`;
  await retry(MINIO_PROVISION_ATTEMPTS, async () => {
    const smokeUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: smokeKey,
        ContentType: "text/plain",
      }),
      { expiresIn: 60 },
    );
    const smokeRes = await fetch(smokeUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "ok",
    });

    if (!smokeRes.ok) {
      throw new Error(
        `MinIO smoke upload failed (${smokeRes.status}). ` +
          "Is MinIO running? Start it with: docker compose -f docker-compose.dev.yml up -d minio",
      );
    }
  });
}

const GLOBAL_RUN_LOCK = "playwright-global-run";
const GLOBAL_RUN_LOCK_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export default async function globalSetup(_: FullConfig) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for E2E global setup");
  }

  const releaseRunLock = await acquireE2eLock(GLOBAL_RUN_LOCK, {
    timeoutMs: GLOBAL_RUN_LOCK_TIMEOUT_MS,
  });

  try {
    await provisionMinioBucket();

    execSync("bun run dev:seed-scenarios", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (error) {
    await releaseRunLock();
    throw error;
  }
}
