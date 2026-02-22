import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import {
  resourceIdPathParamsSchema,
  uploadRenameRequestSchema,
} from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";
import { s3Bucket, s3Client } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function parseUploadId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload ID" }, { status: 400 });
  }

  return parsed.data.id;
}

function sanitizeFilename(filename: string) {
  return filename.trim();
}

/**
 * Rename one upload.
 * @pathParams resourceIdPathParamsSchema
 * @body uploadRenameRequestSchema
 * @response uploadRenameResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseUploadId(context.params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid update payload", error, 400);
  }

  const parsedBody = uploadRenameRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid update payload", parsedBody.error, 400);
  }

  const trimmed = sanitizeFilename(parsedBody.data.filename);
  if (!trimmed) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.upload.update({
      where: { id: upload.id },
      data: { filename: trimmed },
      select: {
        id: true,
        key: true,
        filename: true,
        size: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      upload: {
        id: updated.id,
        key: updated.key,
        filename: updated.filename,
        size: updated.size,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError("Failed to rename upload", error);
  }
}

/**
 * Delete one upload.
 * @pathParams resourceIdPathParamsSchema
 * @response uploadDeleteResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseUploadId(context.params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, key: true, size: true },
    });

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await s3Client.send(
      new DeleteObjectCommand({ Bucket: s3Bucket, Key: upload.key }),
    );

    await prisma.upload.delete({ where: { id: upload.id } });

    return NextResponse.json({
      deletedId: upload.id,
      deletedSize: upload.size,
    });
  } catch (error) {
    return handleRouteError("Failed to delete upload", error);
  }
}
