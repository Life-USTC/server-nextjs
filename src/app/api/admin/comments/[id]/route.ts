import { NextResponse } from "next/server";
import type { CommentStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import { badRequest, handleRouteError, unauthorized } from "@/lib/api-helpers";
import {
  adminModerateCommentRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function parseCommentId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid comment ID");
  }

  return parsed.data.id;
}

/**
 * Moderate one comment.
 * @pathParams resourceIdPathParamsSchema
 * @body adminModerateCommentRequestSchema
 * @response adminModeratedCommentResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
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
