import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { buildCommentNodes } from "@/lib/comment-serialization";
import { getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const prismaAny = prisma as typeof prisma & {
  comment: any;
  commentAttachment: any;
  commentReaction: any;
  upload: any;
};

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
    const comment = await prismaAny.comment.findUnique({
      where: { id },
      include: {
        sectionTeacher: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
            teacher: true,
          },
        },
        section: true,
        course: true,
        teacher: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const viewer = await getViewerContext();
    const threadKey = comment.rootId ?? comment.id;

    const threadComments = await prismaAny.comment.findMany({
      where: {
        OR: [{ id: threadKey }, { rootId: threadKey }],
      },
      include: {
        user: {
          include: {
            accounts: {
              select: { provider: true },
            },
          },
        },
        attachments: { include: { upload: true } },
        reactions: true,
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
  let body: { body?: string; attachmentIds?: string[] } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid comment update", error, 400);
  }

  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const hasAttachmentUpdate = Array.isArray(body.attachmentIds);
  const attachmentIds = hasAttachmentUpdate
    ? (body.attachmentIds ?? []).filter((id) => typeof id === "string")
    : [];

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await getViewerContext();
    const comment = await prismaAny.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (String(comment.status) !== "active") {
      return NextResponse.json({ error: "Comment locked" }, { status: 403 });
    }

    if (!viewer.isAdmin && comment.userId !== viewer.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (hasAttachmentUpdate) {
      const uploads = await prismaAny.upload.findMany({
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
      const txAny = tx as typeof prismaAny;
      await txAny.comment.update({
        where: { id },
        data: { body: content },
      });

      if (!hasAttachmentUpdate) {
        return;
      }

      if (attachmentIds.length > 0) {
        await txAny.commentAttachment.deleteMany({
          where: {
            commentId: id,
            uploadId: { notIn: attachmentIds },
          },
        });

        await txAny.commentAttachment.createMany({
          data: attachmentIds.map((uploadId) => ({
            uploadId,
            commentId: id,
          })),
          skipDuplicates: true,
        });
      } else {
        await txAny.commentAttachment.deleteMany({
          where: {
            commentId: id,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
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

    const comment = await prismaAny.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prismaAny.comment.update({
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
