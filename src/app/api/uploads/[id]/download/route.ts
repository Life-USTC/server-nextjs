import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import {
  badRequest,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { getS3Bucket, getS3SignedUrl } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

async function parseUploadId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid upload ID");
  }

  return parsed.data.id;
}

function buildContentDisposition(filename: string) {
  const safeName = filename.replace(/"/g, "'");
  return `attachment; filename="${safeName}"`;
}

/**
 * Redirect to signed URL for one upload.
 * @pathParams resourceIdPathParamsSchema
 * @response 302
 * @response 401:openApiErrorSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const parsed = await parseUploadId(context.params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId },
    });

    if (!upload) {
      return notFound();
    }

    const command = new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: upload.key,
      ResponseContentDisposition: buildContentDisposition(upload.filename),
      ResponseContentType: upload.contentType ?? undefined,
    });

    const url = await getS3SignedUrl(command, { expiresIn: 60 });
    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError("Failed to prepare download", error);
  }
}
