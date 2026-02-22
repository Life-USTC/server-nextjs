import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { CommentVisibility } from "@/generated/prisma/client";
import { handleRouteError } from "@/lib/api-helpers";
import { commentUpdateRequestSchema } from "@/lib/api-schemas";
import { buildCommentNodes } from "@/lib/comment-serialization";
import { getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function findComment(nodes: any[], id: string): any | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findComment(node.replies ?? [], id);
    if (nested) return nested;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const viewer = await getViewerContext({ includeAdmin: false });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid comment update", error, 400);
  }

  const parsedBody = commentUpdateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid comment update", parsedBody.error, 400);
  }

  const content = parsedBody.data.body;

  const visibility =
    typeof parsedBody.data.visibility === "string"
      ? (parsedBody.data.visibility as CommentVisibility)
      : undefined;
  const isAnonymous =
    typeof parsedBody.data.isAnonymous === "boolean"
      ? parsedBody.data.isAnonymous
      : undefined;

  const hasAttachmentUpdate = Array.isArray(parsedBody.data.attachmentIds);
  const attachmentIds = hasAttachmentUpdate
    ? (parsedBody.data.attachmentIds ?? [])
    : [];

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await getViewerContext();
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (String(comment.status) === "deleted") {
      return NextResponse.json({ error: "Comment locked" }, { status: 403 });
    }

    if (!viewer.isAdmin && comment.userId !== viewer.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (hasAttachmentUpdate) {
      const uploads = await prisma.upload.findMany({
        where: {
          id: { in: attachmentIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (uploads.length !== attachmentIds.length) {
        return NextResponse.json(
          { error: "Invalid attachments" },
          { status: 400 },
        );
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { roots } = buildCommentNodes([updatedComment], viewer);

    return NextResponse.json({ success: true, comment: roots[0] });
  } catch (error) {
    return handleRouteError("Failed to update comment", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.update({
      where: { id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete comment", error);
  }
}
