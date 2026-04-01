import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { getS3SignedUrl, s3Bucket } from "@/lib/storage/s3";

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

function resolveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    requestUrl.protocol.replace(/:$/, "");

  if (!host) {
    return requestUrl.origin;
  }

  return `${protocol}://${host}`;
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
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }
  const userId = session.user.id;

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
      Bucket: s3Bucket,
      Key: upload.key,
      ResponseContentDisposition: buildContentDisposition(upload.filename),
      ResponseContentType: upload.contentType ?? undefined,
    });

    const origin = resolveRequestOrigin(request);
    const url = await getS3SignedUrl(command, { expiresIn: 60, origin });
    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError("Failed to prepare download", error);
  }
}
