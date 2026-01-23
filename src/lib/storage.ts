import { randomUUID } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const s3Bucket = requireEnv("S3_BUCKET");
const s3AccessKeyId = requireEnv("S3_ACCESS_KEY_ID");
const s3SecretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
const s3Endpoint = requireEnv("S3_ENDPOINT");
const s3Region = process.env.S3_REGION ?? "auto";
const s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
  },
  endpoint: s3Endpoint,
  forcePathStyle: s3ForcePathStyle,
  region: s3Region,
});

export function buildUploadKey(userId: string) {
  const uniqueSuffix = randomUUID();
  return `uploads/${userId}/${Date.now()}-${uniqueSuffix}`;
}
