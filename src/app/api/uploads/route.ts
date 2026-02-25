import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import {
  badRequest,
  handleRouteError,
  parseOptionalInt,
  payloadTooLarge,
  unauthorized,
} from "@/lib/api-helpers";
import { uploadCreateRequestSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";
import { buildUploadKey, getS3SignedUrl, s3Bucket } from "@/lib/storage";
import { uploadConfig } from "@/lib/upload-config";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_EXPIRES_SECONDS = 300;

class UploadError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function isSerializationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: string }).code === "string" &&
    (error as { code?: string }).code === "P2034"
  );
}

async function runSerializableTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(action, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (isSerializationError(error) && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to reserve upload quota");
}

function parseFileSize(value: unknown) {
  return parseOptionalInt(value);
}

function normalizeContentType(value: unknown) {
  if (typeof value !== "string") return "application/octet-stream";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "application/octet-stream";
}

/**
 * List uploads of current user.
 * @response uploadsListResponseSchema
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const userId = session.user.id;

  try {
    const now = new Date();
    await prisma.uploadPending.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    });

    const [uploads, usage, pendingUsage] = await Promise.all([
      prisma.upload.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          key: true,
          filename: true,
          size: true,
          createdAt: true,
        },
      }),
      prisma.upload.aggregate({
        where: { userId },
        _sum: { size: true },
      }),
      prisma.uploadPending.aggregate({
        where: { userId, expiresAt: { gt: now } },
        _sum: { size: true },
      }),
    ]);

    const usedBytes = (usage._sum.size ?? 0) + (pendingUsage._sum.size ?? 0);

    return NextResponse.json({
      maxFileSizeBytes: uploadConfig.maxFileSizeBytes,
      quotaBytes: uploadConfig.totalQuotaBytes,
      uploads: uploads.map((upload) => ({
        id: upload.id,
        key: upload.key,
        filename: upload.filename,
        size: upload.size,
        createdAt: upload.createdAt.toISOString(),
      })),
      usedBytes,
    });
  } catch (error) {
    return handleRouteError("Failed to list uploads", error);
  }
}

/**
 * Create a signed upload URL.
 * @body uploadCreateRequestSchema
 * @response uploadCreateResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const userId = session.user.id;

  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid upload request", error, 400);
  }

  const parsedBody = uploadCreateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid upload request", parsedBody.error, 400);
  }

  const filename = parsedBody.data.filename;
  if (!filename.trim()) {
    return badRequest("Filename is required");
  }

  const size = parseFileSize(parsedBody.data.size);
  if (!size || size <= 0) {
    return badRequest("Invalid file size");
  }

  if (size > uploadConfig.maxFileSizeBytes) {
    return payloadTooLarge("File too large");
  }

  try {
    const now = new Date();
    await prisma.uploadPending.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    });

    const contentType = normalizeContentType(parsedBody.data.contentType);
    const key = buildUploadKey(userId);
    const expiresAt = new Date(Date.now() + MAX_UPLOAD_EXPIRES_SECONDS * 1000);

    const reservation = await runSerializableTransaction(async (tx) => {
      const [usage, pendingUsage] = await Promise.all([
        tx.upload.aggregate({
          where: { userId },
          _sum: { size: true },
        }),
        tx.uploadPending.aggregate({
          where: { userId, expiresAt: { gt: now } },
          _sum: { size: true },
        }),
      ]);

      const usedBytes = (usage._sum.size ?? 0) + (pendingUsage._sum.size ?? 0);
      if (usedBytes + size > uploadConfig.totalQuotaBytes) {
        throw new UploadError("Quota exceeded");
      }

      await tx.uploadPending.create({
        data: {
          contentType,
          expiresAt,
          filename,
          key,
          size,
          userId,
        },
      });

      return { usedBytes };
    });

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      ContentType: contentType,
    });
    const origin = new URL(request.url).origin;
    const url = await getS3SignedUrl(command, {
      expiresIn: MAX_UPLOAD_EXPIRES_SECONDS,
      origin,
    });

    return NextResponse.json({
      key,
      url,
      maxFileSizeBytes: uploadConfig.maxFileSizeBytes,
      quotaBytes: uploadConfig.totalQuotaBytes,
      usedBytes: reservation.usedBytes,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return badRequest(error.code);
    }
    return handleRouteError("Failed to create upload", error);
  }
}
