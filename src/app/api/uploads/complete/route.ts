import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { handleRouteError } from "@/lib/api-helpers";
import { uploadCompleteRequestSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";
import { s3Bucket, s3Client } from "@/lib/storage";
import { uploadConfig } from "@/lib/upload-config";

export const dynamic = "force-dynamic";

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

  throw new Error("Failed to finalize upload quota");
}

function normalizeContentType(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Finalize one upload after S3 put.
 * @body uploadCompleteRequestSchema
 * @response uploadCompleteResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid upload completion payload", error, 400);
  }

  const parsedBody = uploadCompleteRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid upload completion payload",
      parsedBody.error,
      400,
    );
  }

  const { key, filename } = parsedBody.data;

  if (!key || !filename) {
    return NextResponse.json({ error: "Missing upload data" }, { status: 400 });
  }

  const expectedPrefix = `uploads/${userId}/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    await prisma.uploadPending.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    });

    const existing = await prisma.upload.findUnique({ where: { key } });
    if (existing) {
      await prisma.uploadPending.deleteMany({ where: { key } });
      const [usage, pendingUsage] = await Promise.all([
        prisma.upload.aggregate({
          where: { userId },
          _sum: { size: true },
        }),
        prisma.uploadPending.aggregate({
          where: { userId, expiresAt: { gt: now } },
          _sum: { size: true },
        }),
      ]);

      const usedBytes =
        (usage._sum.size ?? existing.size) + (pendingUsage._sum.size ?? 0);

      return NextResponse.json({
        upload: {
          id: existing.id,
          key: existing.key,
          filename: existing.filename,
          size: existing.size,
          createdAt: existing.createdAt.toISOString(),
        },
        usedBytes,
        quotaBytes: uploadConfig.totalQuotaBytes,
      });
    }

    const head = await s3Client.send(
      new HeadObjectCommand({ Bucket: s3Bucket, Key: key }),
    );

    const size = head.ContentLength ?? 0;
    if (!size || size <= 0) {
      return NextResponse.json(
        { error: "Uploaded object missing" },
        { status: 400 },
      );
    }

    if (size > uploadConfig.maxFileSizeBytes) {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }),
      );
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const contentType =
      normalizeContentType(parsedBody.data.contentType) ?? head.ContentType;

    const reservation = await runSerializableTransaction(async (tx) => {
      const pending = await tx.uploadPending.findUnique({ where: { key } });
      if (!pending || pending.userId !== userId) {
        throw new UploadError("Upload session expired");
      }

      if (pending.expiresAt < now) {
        await tx.uploadPending.delete({ where: { key } });
        throw new UploadError("Upload session expired");
      }

      const [usage, pendingUsage] = await Promise.all([
        tx.upload.aggregate({
          where: { userId },
          _sum: { size: true },
        }),
        tx.uploadPending.aggregate({
          where: {
            userId,
            expiresAt: { gt: now },
            NOT: { key },
          },
          _sum: { size: true },
        }),
      ]);

      const usedBytes = (usage._sum.size ?? 0) + (pendingUsage._sum.size ?? 0);
      if (usedBytes + size > uploadConfig.totalQuotaBytes) {
        await tx.uploadPending.delete({ where: { key } });
        throw new UploadError("Quota exceeded");
      }

      const upload = await tx.upload.create({
        data: {
          contentType,
          filename,
          key,
          size,
          userId,
        },
      });

      await tx.uploadPending.delete({ where: { key } });

      return { upload, usedBytes: usedBytes + size };
    });

    return NextResponse.json({
      upload: {
        id: reservation.upload.id,
        key: reservation.upload.key,
        filename: reservation.upload.filename,
        size: reservation.upload.size,
        createdAt: reservation.upload.createdAt.toISOString(),
      },
      usedBytes: reservation.usedBytes,
      quotaBytes: uploadConfig.totalQuotaBytes,
    });
  } catch (error) {
    if (error instanceof UploadError) {
      if (
        error.code === "Quota exceeded" ||
        error.code === "Upload session expired"
      ) {
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }),
        );
      }
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    return handleRouteError("Failed to finalize upload", error);
  }
}
