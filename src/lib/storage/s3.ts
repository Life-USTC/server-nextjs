import { randomUUID } from "node:crypto";
import {
  type DeleteObjectCommand,
  type DeleteObjectCommandOutput,
  type GetObjectCommand,
  type HeadObjectCommand,
  type HeadObjectCommandOutput,
  type PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const s3Bucket = requireEnv("S3_BUCKET");

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  },
  endpoint: requireEnv("S3_ENDPOINT"),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  region: process.env.S3_REGION ?? "auto",
});

export function sendS3(
  command: HeadObjectCommand,
): Promise<HeadObjectCommandOutput>;
export function sendS3(
  command: DeleteObjectCommand,
): Promise<DeleteObjectCommandOutput>;
export async function sendS3(command: unknown) {
  return s3Client.send(command as never);
}

export function getS3SignedUrl(
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number },
): Promise<string>;
export async function getS3SignedUrl(
  command: unknown,
  options: { expiresIn: number },
) {
  // Always use short-lived presigned URLs so download links expire and cannot
  // be shared outside the authenticated download flow.  Stable public R2 URLs
  // must never be returned here; callers that need public CDN URLs should
  // construct them directly from R2_ACCESS_URL at the call site.
  return getSignedUrl(s3Client, command as never, {
    expiresIn: options.expiresIn,
  });
}

export function buildUploadKey(userId: string) {
  const uniqueSuffix = randomUUID();
  return `uploads/${userId}/${Date.now()}-${uniqueSuffix}`;
}
