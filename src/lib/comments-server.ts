import type {
  CommentNode,
  CommentTarget,
  CommentViewer,
} from "@/components/comments/comment-types";
import { buildCommentNodes } from "@/lib/comment-serialization";
import { getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

type CommentsPayload = {
  comments: CommentNode[];
  hiddenCount: number;
  viewer: CommentViewer;
};

const prismaAny = prisma as typeof prisma & {
  comment: any;
  sectionTeacher: any;
  section: any;
};

async function resolveSectionTeacherId(sectionId: number, teacherId: number) {
  const section = await prismaAny.section.findFirst({
    where: {
      id: sectionId,
      teachers: {
        some: { id: teacherId },
      },
    },
    select: { id: true },
  });

  if (!section) return null;

  const sectionTeacher = await prismaAny.sectionTeacher.upsert({
    where: {
      sectionId_teacherId: {
        sectionId,
        teacherId,
      },
    },
    update: {},
    create: { sectionId, teacherId },
  });

  return sectionTeacher.id as number;
}

export async function getCommentsPayload(
  target: CommentTarget,
  viewerOverride?: CommentViewer,
): Promise<CommentsPayload> {
  const viewer =
    viewerOverride ?? (await getViewerContext({ includeAdmin: false }));
  const viewerInfo = {
    userId: viewer.userId,
    name: viewer.name,
    image: viewer.image,
    isAdmin: viewer.isAdmin,
    isAuthenticated: viewer.isAuthenticated,
  };

  let whereTarget: Record<string, number | string> | null = null;
  let resolvedSectionTeacherId: number | null = null;

  if (target.type === "section" && target.targetId) {
    whereTarget = { sectionId: target.targetId };
  } else if (target.type === "course" && target.targetId) {
    whereTarget = { courseId: target.targetId };
  } else if (target.type === "teacher" && target.targetId) {
    whereTarget = { teacherId: target.targetId };
  } else if (target.type === "homework") {
    const homeworkId =
      target.homeworkId ?? (target.targetId as string | undefined);
    if (homeworkId) {
      whereTarget = { homeworkId };
    }
  } else if (target.type === "section-teacher") {
    const sectionTeacherId = target.sectionTeacherId ?? target.targetId ?? null;
    if (sectionTeacherId) {
      resolvedSectionTeacherId = sectionTeacherId;
    } else if (target.sectionId && target.teacherId) {
      resolvedSectionTeacherId = await resolveSectionTeacherId(
        target.sectionId,
        target.teacherId,
      );
    }

    if (resolvedSectionTeacherId) {
      whereTarget = { sectionTeacherId: resolvedSectionTeacherId };
    }
  }

  if (!whereTarget) {
    return { comments: [], hiddenCount: 0, viewer };
  }

  const comments = await prismaAny.comment.findMany({
    where: whereTarget,
    include: {
      user: {
        include: {
          accounts: {
            select: {
              provider: true,
            },
          },
        },
      },
      attachments: {
        include: {
          upload: true,
        },
      },
      reactions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const { roots, hiddenCount } = buildCommentNodes(comments, viewerInfo);

  return { comments: roots, hiddenCount, viewer };
}
