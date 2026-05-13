import type { CommentStatus } from "@/generated/prisma/client";
import { withAdminRoute } from "@/lib/admin-utils";
import {
  jsonResponse,
  parseRouteJsonBody,
  parseRouteParams,
} from "@/lib/api/helpers";
import {
  adminModerateCommentRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function parseCommentId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid comment ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
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
  return withAdminRoute("Failed to update comment", async (admin) => {
    const parsed = await parseCommentId(params);
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

    writeAuditLog({
      action: "admin_comment_moderate",
      userId: admin.userId,
      targetId: id,
      targetType: "comment",
      metadata: { status, moderationNote: moderationNote ?? null },
    }).catch(() => {});

    return jsonResponse({ comment: updated });
  });
}
