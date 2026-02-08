import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { buildUploadKey, s3Bucket, s3Client } from "@/lib/storage";
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
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeContentType(value: unknown) {
  if (typeof value !== "string") return "application/octet-stream";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "application/octet-stream";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { filename?: string; contentType?: string; size?: unknown } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid upload request", error, 400);
  }

  const filename = typeof body.filename === "string" ? body.filename : "";
  if (!filename.trim()) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 },
    );
  }

  const size = parseFileSize(body.size);
  if (!size || size <= 0) {
    return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
  }

  if (size > uploadConfig.maxFileSizeBytes) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const now = new Date();
    await prisma.uploadPending.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    });

    const contentType = normalizeContentType(body.contentType);
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
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: MAX_UPLOAD_EXPIRES_SECONDS,
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
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    return handleRouteError("Failed to create upload", error);
  }
}
