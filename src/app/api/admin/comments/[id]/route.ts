import type { CommentStatus } from "@/generated/prisma/client";
import { withAdminRoute } from "@/lib/admin-utils";
import {
  jsonResponse,
  notFound,
  parseResourceIdParam,
  parseRouteJsonBody,
} from "@/lib/api/helpers";
import { adminModerateCommentRequestSchema } from "@/lib/api/schemas/request-schemas";
import { fireAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

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
  return withAdminRoute("Failed to update comment", async (admin) => {
    const parsed = await parseResourceIdParam(params, "comment");
    if (parsed instanceof Response) {
      return parsed;
    }
    const id = parsed;
    const parsedBody = await parseRouteJsonBody(
      request,
      adminModerateCommentRequestSchema,
      "Invalid moderation request",
    );
    if (parsedBody instanceof Response) {
      return parsedBody;
    }

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return notFound();
    }

    const { status, moderationNote } = parsedBody;
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

    fireAuditLog({
      action: "admin_comment_moderate",
      userId: admin.userId,
      targetId: id,
      targetType: "comment",
      metadata: { status, moderationNote: moderationNote ?? null },
    });

    return jsonResponse({ comment: updated });
  });
}
