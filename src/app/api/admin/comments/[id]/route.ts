import { NextResponse } from "next/server";
import type { CommentStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { adminModerateCommentRequestSchema } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid moderation request", error, 400);
  }

  const parsedBody = adminModerateCommentRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid moderation request",
      parsedBody.error,
      400,
    );
  }

  const { status, moderationNote } = parsedBody.data;

  try {
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        status: status as CommentStatus,
        moderationNote: moderationNote ?? null,
        moderatedAt: new Date(),
        moderatedById: admin.userId,
        deletedAt: status === "deleted" ? new Date() : null,
      },
    });

    return NextResponse.json({ comment: updated });
  } catch (error) {
    return handleRouteError("Failed to update comment", error);
  }
}
