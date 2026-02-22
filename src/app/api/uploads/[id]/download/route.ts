import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { resourceIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
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

function buildContentDisposition(filename: string) {
  const safeName = filename.replace(/"/g, "'");
  return `attachment; filename="${safeName}"`;
}

/**
 * Redirect to signed URL for one upload.
 * @pathParams resourceIdPathParamsSchema
 * @response 302
 * @response 404:openApiErrorSchema
 */
export async function GET(
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
    const upload = await prisma.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: upload.key,
      ResponseContentDisposition: buildContentDisposition(upload.filename),
      ResponseContentType: upload.contentType ?? undefined,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError("Failed to prepare download", error);
  }
}
