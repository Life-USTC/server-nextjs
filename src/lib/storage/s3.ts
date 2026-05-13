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
import { getStorageEnv } from "@/env";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getS3Bucket() {
  return requireEnv(getStorageEnv().S3_BUCKET, "S3_BUCKET");
}

export function getS3Region() {
  return getStorageEnv().AWS_REGION ?? "us-east-1";
}

export function getS3Endpoint() {
  const { AWS_ENDPOINT_URL_S3, AWS_ENDPOINT_URL } = getStorageEnv();
  return AWS_ENDPOINT_URL_S3 ?? AWS_ENDPOINT_URL;
}

function toOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

export function getS3ConnectSources() {
  const endpoint = getS3Endpoint();
  const endpointOrigin = toOrigin(endpoint);
  if (endpointOrigin) {
    return [endpointOrigin];
  }

  const { S3_BUCKET } = getStorageEnv();
  if (!S3_BUCKET) {
    return [];
  }

  const region = getS3Region();
  return [
    `https://${S3_BUCKET}.s3.${region}.amazonaws.com`,
    `https://s3.${region}.amazonaws.com`,
  ];
}

function createS3Client() {
  const endpoint = getS3Endpoint();
  return new S3Client({
    region: getS3Region(),
    ...(endpoint ? { forcePathStyle: true } : {}),
    ...(endpoint ? { endpoint } : {}),
  });
}

let s3Client: S3Client | null = null;

function getS3Client() {
  s3Client ??= createS3Client();
  return s3Client;
}

export function sendS3(
  command: HeadObjectCommand,
): Promise<HeadObjectCommandOutput>;
export function sendS3(
  command: DeleteObjectCommand,
): Promise<DeleteObjectCommandOutput>;
export async function sendS3(command: unknown) {
  return getS3Client().send(command as never);
}

export function getS3SignedUrl(
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number },
): Promise<string>;
export async function getS3SignedUrl(
  command: unknown,
  options: { expiresIn: number },
) {
  return getSignedUrl(getS3Client(), command as never, {
    expiresIn: options.expiresIn,
  });
}

export function buildUploadKey(userId: string) {
  const uniqueSuffix = randomUUID();
  return `uploads/${userId}/${Date.now()}-${uniqueSuffix}`;
}
