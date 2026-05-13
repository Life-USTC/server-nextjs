import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  badRequest,
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteJsonBody,
  parseRouteParams,
  unauthorized,
} from "@/lib/api/helpers";
import {
  resourceIdPathParamsSchema,
  uploadRenameRequestSchema,
} from "@/lib/api/schemas/request-schemas";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/write-audit-log";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getS3Bucket, sendS3 } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

async function parseUploadId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid upload ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
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
 * @response 401:openApiErrorSchema
 * @response 404:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const parsed = await parseUploadId(context.params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;
  const parsedBody = await parseRouteJsonBody(
    request,
    uploadRenameRequestSchema,
    "Invalid update payload",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const trimmed = sanitizeFilename(parsedBody.filename);
  if (!trimmed) {
    return badRequest("Filename required");
  }

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!upload) {
      return notFound();
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

    return jsonResponse({
      upload: {
        id: updated.id,
        key: updated.key,
        filename: updated.filename,
        size: updated.size,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError("Failed to rename upload", error);
  }
}

/**
 * Delete one upload.
 * @pathParams resourceIdPathParamsSchema
 * @response 200:uploadDeleteResponseSchema
 * @response 401:openApiErrorSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const parsed = await parseUploadId(context.params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId },
      select: { id: true, key: true, size: true },
    });

    if (!upload) {
      return notFound();
    }

    await sendS3(
      new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: upload.key }),
    );

    await prisma.upload.delete({ where: { id: upload.id } });

    writeAuditLog({
      action: "upload_delete",
      userId,
      targetId: upload.id,
      targetType: "upload",
      metadata: { key: upload.key, size: upload.size },
      ...getAuditRequestMetadata(request),
    }).catch(() => {});

    return jsonResponse({
      deletedId: upload.id,
      deletedSize: upload.size,
    });
  } catch (error) {
    return handleRouteError("Failed to delete upload", error);
  }
}
