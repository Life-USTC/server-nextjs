import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { s3Bucket, s3Client } from "@/lib/storage";

export const dynamic = "force-dynamic";

function buildContentDisposition(filename: string) {
  const safeName = filename.replace(/"/g, "'");
  return `attachment; filename="${safeName}"`;
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  try {
    const upload = await prisma.upload.findFirst({
      where: { id, userId: session.user.id },
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
