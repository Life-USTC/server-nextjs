import { randomUUID } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  deleteMockS3Object,
  getMockS3Object,
  isMockS3Enabled,
} from "@/lib/mock-s3";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function inferOrigin(origin?: string) {
  if (origin) {
    return origin;
  }
  return "http://127.0.0.1:3000";
}

export const s3Bucket = isMockS3Enabled()
  ? "mock-bucket"
  : requireEnv("S3_BUCKET");

export const s3Client = isMockS3Enabled()
  ? (null as unknown as S3Client)
  : new S3Client({
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
      endpoint: requireEnv("S3_ENDPOINT"),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      region: process.env.S3_REGION ?? "auto",
    });

export async function sendS3(command: unknown) {
  if (!isMockS3Enabled()) {
    return s3Client.send(command as never);
  }

  const name = (command as { constructor?: { name?: string } })?.constructor
    ?.name;
  const input = (command as { input?: { Key?: string } })?.input;
  const key = input?.Key;
  if (!key) {
    return {};
  }

  if (name === "HeadObjectCommand") {
    const object = getMockS3Object(key);
    if (!object) {
      throw new Error("NotFound");
    }
    return {
      ContentLength: object.body.byteLength,
      ContentType: object.contentType,
    };
  }

  if (name === "DeleteObjectCommand") {
    deleteMockS3Object(key);
    return {};
  }

  return {};
}

export async function getS3SignedUrl(
  command: unknown,
  options: { expiresIn: number; origin?: string },
) {
  if (!isMockS3Enabled()) {
    return getSignedUrl(s3Client, command as never, {
      expiresIn: options.expiresIn,
    });
  }

  const input = (command as { input?: Record<string, unknown> })?.input ?? {};
  const key = typeof input.Key === "string" ? input.Key : undefined;
  const contentType =
    typeof input.ContentType === "string" ? input.ContentType : undefined;
  const responseContentType =
    typeof input.ResponseContentType === "string"
      ? input.ResponseContentType
      : undefined;
  const responseContentDisposition =
    typeof input.ResponseContentDisposition === "string"
      ? input.ResponseContentDisposition
      : undefined;

  const origin = inferOrigin(options.origin);

  if (!key) {
    return `${origin}/api/__mock-s3`;
  }

  const base = new URL(`${origin}/api/mock-s3`);
  base.searchParams.set("key", key);

  const commandName = (command as { constructor?: { name?: string } })
    ?.constructor?.name;
  if (commandName === "PutObjectCommand") {
    base.searchParams.set(
      "contentType",
      contentType ?? "application/octet-stream",
    );
    return `${base.pathname}?${base.searchParams.toString()}`;
  }

  if (commandName === "GetObjectCommand") {
    if (responseContentType) {
      base.searchParams.set("contentType", responseContentType);
    }
    if (responseContentDisposition) {
      const match = /filename="([^"]+)"/.exec(responseContentDisposition);
      if (match?.[1]) {
        base.searchParams.set("filename", match[1]);
      }
    }
    return base.toString();
  }

  return base.toString();
}

export function buildUploadKey(userId: string) {
  const uniqueSuffix = randomUUID();
  return `uploads/${userId}/${Date.now()}-${uniqueSuffix}`;
}
