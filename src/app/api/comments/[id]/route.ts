import { NextResponse } from "next/server";
import {
  buildCommentNodes,
  type CommentNode,
} from "@/features/comments/server/comment-serialization";
import {
  badRequest,
  forbidden,
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteInput,
  parseRouteJsonBody,
  unauthorized,
} from "@/lib/api/helpers";
import {
  commentUpdateRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import {
  getAuditRequestMetadata,
  writeAuditLog,
} from "@/lib/audit/write-audit-log";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { getViewerContext } from "@/lib/auth/viewer-context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function findComment(nodes: CommentNode[], id: string): CommentNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findComment(node.replies ?? [], id);
    if (nested) return nested;
  }
  return null;
}

async function parseCommentId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = parseRouteInput(
    raw,
    resourceIdPathParamsSchema,
    "Invalid comment ID",
  );
  if (parsed instanceof Response) {
    return badRequest("Invalid comment ID");
  }

  return parsed.id;
}

/**
 * Get one comment thread by comment ID.
 * @pathParams resourceIdPathParamsSchema
 * @response commentThreadResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: {
        sectionId: true,
        courseId: true,
        teacherId: true,
        sectionTeacherId: true,
        rootId: true,
        id: true,
        homework: {
          select: {
            id: true,
            title: true,
            section: {
              select: { jwId: true, code: true },
            },
          },
        },
        sectionTeacher: {
          select: {
            sectionId: true,
            teacherId: true,
            section: {
              select: {
                jwId: true,
                code: true,
                course: {
                  select: { jwId: true, nameCn: true },
                },
              },
            },
            teacher: {
              select: { nameCn: true },
            },
          },
        },
        section: {
          select: { jwId: true, code: true },
        },
        course: {
          select: { jwId: true, nameCn: true },
        },
        teacher: {
          select: { nameCn: true },
        },
      },
    });

    if (!comment) {
      return notFound();
    }

    const viewerUserId = await resolveApiUserId(request);
    const viewer = await getViewerContext({
      includeAdmin: false,
      userId: viewerUserId,
    });
    const threadKey = comment.rootId ?? comment.id;

    const threadComments = await prisma.comment.findMany({
      where: {
        OR: [{ id: threadKey }, { rootId: threadKey }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isAdmin: true,
            accounts: {
              select: { provider: true },
            },
          },
        },
        attachments: {
          include: {
            upload: {
              select: {
                filename: true,
                contentType: true,
                size: true,
              },
            },
          },
        },
        reactions: {
          select: {
            type: true,
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const { roots, hiddenCount } = buildCommentNodes(threadComments, viewer);
    const focus = findComment(roots, id);

    if (!focus) {
      return forbidden();
    }

    return jsonResponse({
      thread: roots,
      focusId: id,
      hiddenCount,
      viewer,
      target: {
        sectionId: comment.sectionId ?? null,
        courseId: comment.courseId ?? null,
        teacherId: comment.teacherId ?? null,
        sectionTeacherId: comment.sectionTeacherId ?? null,
        sectionTeacherSectionId: comment.sectionTeacher?.sectionId ?? null,
        sectionTeacherTeacherId: comment.sectionTeacher?.teacherId ?? null,
        sectionTeacherSectionJwId:
          comment.sectionTeacher?.section?.jwId ?? null,
        sectionTeacherSectionCode:
          comment.sectionTeacher?.section?.code ?? null,
        sectionTeacherTeacherName:
          comment.sectionTeacher?.teacher?.nameCn ?? null,
        sectionTeacherCourseJwId:
          comment.sectionTeacher?.section?.course?.jwId ?? null,
        sectionTeacherCourseName:
          comment.sectionTeacher?.section?.course?.nameCn ?? null,
        homeworkId: comment.homework?.id ?? null,
        homeworkTitle: comment.homework?.title ?? null,
        homeworkSectionJwId: comment.homework?.section?.jwId ?? null,
        homeworkSectionCode: comment.homework?.section?.code ?? null,
        sectionJwId: comment.section?.jwId ?? null,
        sectionCode: comment.section?.code ?? null,
        courseJwId: comment.course?.jwId ?? null,
        courseName: comment.course?.nameCn ?? null,
        teacherName: comment.teacher?.nameCn ?? null,
      },
    });
  } catch (error) {
    return handleRouteError("Failed to fetch comment", error);
  }
}

/**
 * Update one comment.
 * @pathParams resourceIdPathParamsSchema
 * @body commentUpdateRequestSchema
 * @response commentUpdateResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
  const parsedBody = await parseRouteJsonBody(
    request,
    commentUpdateRequestSchema,
    "Invalid comment update",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const content = parsedBody.body;

  const visibility =
    typeof parsedBody.visibility === "string"
      ? parsedBody.visibility
      : undefined;
  const isAnonymous =
    typeof parsedBody.isAnonymous === "boolean"
      ? parsedBody.isAnonymous
      : undefined;

  const hasAttachmentUpdate = Array.isArray(parsedBody.attachmentIds);
  const attachmentIds = hasAttachmentUpdate
    ? (parsedBody.attachmentIds ?? [])
    : [];

  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return unauthorized();
    }

    const viewer = await getViewerContext({ userId });
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });

    if (!comment) {
      return notFound();
    }

    if (String(comment.status) === "deleted") {
      return forbidden("Comment locked");
    }

    if (!viewer.isAdmin && comment.userId !== viewer.userId) {
      return forbidden();
    }

    if (hasAttachmentUpdate) {
      const uploads = await prisma.upload.findMany({
        where: {
          id: { in: attachmentIds },
          userId,
        },
        select: { id: true },
      });

      if (uploads.length !== attachmentIds.length) {
        return badRequest("Invalid attachments");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id },
        data: {
          body: content,
          visibility,
          isAnonymous,
        },
      });

      if (!hasAttachmentUpdate) {
        return;
      }

      if (attachmentIds.length > 0) {
        await tx.commentAttachment.deleteMany({
          where: {
            commentId: id,
            uploadId: { notIn: attachmentIds },
          },
        });

        await tx.commentAttachment.createMany({
          data: attachmentIds.map((uploadId) => ({
            uploadId,
            commentId: id,
          })),
          skipDuplicates: true,
        });
      } else {
        await tx.commentAttachment.deleteMany({
          where: {
            commentId: id,
          },
        });
      }
    });

    const updatedComment = await prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isAdmin: true,
            accounts: {
              select: { provider: true },
            },
          },
        },
        attachments: {
          include: {
            upload: {
              select: {
                filename: true,
                contentType: true,
                size: true,
              },
            },
          },
        },
        reactions: {
          select: {
            type: true,
            userId: true,
          },
        },
      },
    });

    if (!updatedComment) {
      return notFound();
    }

    const { roots } = buildCommentNodes([updatedComment], viewer);

    writeAuditLog({
      action: "comment_edit",
      userId,
      targetId: id,
      targetType: "comment",
      metadata: { body: content?.slice(0, 200) },
      ...getAuditRequestMetadata(request),
    }).catch(() => {});

    return jsonResponse({ success: true, comment: roots[0] });
  } catch (error) {
    return handleRouteError("Failed to update comment", error);
  }
}

/**
 * Delete one comment.
 * @pathParams resourceIdPathParamsSchema
 * @response successResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return unauthorized();
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!comment) {
      return notFound();
    }

    if (comment.userId !== userId) {
      return forbidden();
    }

    await prisma.comment.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    writeAuditLog({
      action: "comment_delete",
      userId,
      targetId: id,
      targetType: "comment",
      ...getAuditRequestMetadata(request),
    }).catch(() => {});

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete comment", error);
  }
}
