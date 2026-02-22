import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError, parseOptionalInt } from "@/lib/api-helpers";
import {
  commentCreateRequestSchema,
  commentsQuerySchema,
} from "@/lib/api-schemas";
import { buildCommentNodes } from "@/lib/comment-serialization";
import {
  findActiveSuspension,
  getViewerContext,
  resolveSectionTeacherId,
} from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VISIBILITY_VALUES = ["public", "logged_in_only", "anonymous"] as const;
const TARGET_TYPES = [
  "section",
  "course",
  "teacher",
  "section-teacher",
  "homework",
] as const;

type TargetType = (typeof TARGET_TYPES)[number];
type Visibility = (typeof VISIBILITY_VALUES)[number];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = commentsQuerySchema.safeParse({
    targetType: searchParams.get("targetType"),
    targetId: searchParams.get("targetId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    teacherId: searchParams.get("teacherId") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const targetType = parsedQuery.data.targetType as TargetType;
  const targetIdParam = parsedQuery.data.targetId ?? null;
  const targetId = parseOptionalInt(targetIdParam);
  const sectionId = parseOptionalInt(parsedQuery.data.sectionId);
  const teacherId = parseOptionalInt(parsedQuery.data.teacherId);

  try {
    let whereTarget: Record<string, number | string> | null = null;
    let resolvedSectionTeacherId: number | null = null;

    if (targetType === "section" && targetId) {
      whereTarget = { sectionId: targetId };
    } else if (targetType === "course" && targetId) {
      whereTarget = { courseId: targetId };
    } else if (targetType === "teacher" && targetId) {
      whereTarget = { teacherId: targetId };
    } else if (targetType === "homework" && targetIdParam) {
      whereTarget = { homeworkId: targetIdParam };
    } else if (targetType === "section-teacher") {
      const sectionTeacherId = targetId ?? null;
      if (sectionTeacherId) {
        resolvedSectionTeacherId = sectionTeacherId;
      } else if (sectionId && teacherId) {
        resolvedSectionTeacherId = await resolveSectionTeacherId(
          sectionId,
          teacherId,
        );
      }

      if (resolvedSectionTeacherId) {
        whereTarget = { sectionTeacherId: resolvedSectionTeacherId };
      }
    }

    if (!whereTarget) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const [viewer, comments] = await Promise.all([
      getViewerContext({ includeAdmin: false }),
      prisma.comment.findMany({
        where: whereTarget,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isAdmin: true,
              accounts: {
                select: {
                  provider: true,
                },
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
      }),
    ]);

    const { roots, hiddenCount } = buildCommentNodes(comments, viewer);

    return NextResponse.json({
      comments: roots,
      hiddenCount,
      viewer,
      target: {
        type: targetType,
        targetId: targetType === "homework" ? targetIdParam : targetId,
        sectionId,
        teacherId,
        sectionTeacherId: resolvedSectionTeacherId,
        homeworkId: targetType === "homework" ? targetIdParam : null,
      },
    });
  } catch (error) {
    return handleRouteError("Failed to fetch comments", error);
  }
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid comment request", error, 400);
  }

  const parsedBody = commentCreateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid comment request", parsedBody.error, 400);
  }

  const targetType = parsedBody.data.targetType;
  const content = parsedBody.data.body;

  const visibility: Visibility = parsedBody.data.visibility ?? "public";
  const isAnonymous = parsedBody.data.isAnonymous === true;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return NextResponse.json(
      {
        error: "Suspended",
        reason: suspension.reason ?? null,
      },
      { status: 403 },
    );
  }

  try {
    const normalizedTargetId = parseOptionalInt(parsedBody.data.targetId);
    const normalizedHomeworkId =
      typeof parsedBody.data.targetId === "string" &&
      parsedBody.data.targetId.trim().length > 0
        ? parsedBody.data.targetId.trim()
        : null;
    const normalizedSectionId = parseOptionalInt(parsedBody.data.sectionId);
    const normalizedTeacherId = parseOptionalInt(parsedBody.data.teacherId);
    let targetData: Record<string, number | string> | null = null;
    let resolvedSectionTeacherId: number | null = null;

    if (targetType === "section" && normalizedTargetId) {
      targetData = { sectionId: normalizedTargetId };
    } else if (targetType === "course" && normalizedTargetId) {
      targetData = { courseId: normalizedTargetId };
    } else if (targetType === "teacher" && normalizedTargetId) {
      targetData = { teacherId: normalizedTargetId };
    } else if (targetType === "homework" && normalizedHomeworkId) {
      targetData = { homeworkId: normalizedHomeworkId };
    } else if (
      targetType === "section-teacher" &&
      normalizedSectionId &&
      normalizedTeacherId
    ) {
      resolvedSectionTeacherId = await resolveSectionTeacherId(
        normalizedSectionId,
        normalizedTeacherId,
      );
      if (resolvedSectionTeacherId) {
        targetData = { sectionTeacherId: resolvedSectionTeacherId };
      }
    }

    if (!targetData) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    let parentId: string | null = null;
    let rootId: string | null = null;
    if (parsedBody.data.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parsedBody.data.parentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent not found" },
          { status: 404 },
        );
      }

      const sameTarget = Object.entries(targetData).every(
        ([key, value]) => parent[key as keyof typeof parent] === value,
      );
      if (!sameTarget) {
        return NextResponse.json(
          { error: "Parent target mismatch" },
          { status: 400 },
        );
      }
      parentId = parent.id;
      rootId = parent.rootId ?? parent.id;
    }

    const comment = await prisma.comment.create({
      data: {
        body: content,
        visibility,
        status: "active",
        isAnonymous,
        authorName: null,
        userId,
        parentId,
        rootId,
        ...targetData,
      },
    });

    if (!rootId) {
      await prisma.comment.update({
        where: { id: comment.id },
        data: { rootId: comment.id },
      });
    }

    const attachmentIds = parsedBody.data.attachmentIds ?? [];

    if (attachmentIds.length > 0) {
      const uploads = await prisma.upload.findMany({
        where: {
          id: { in: attachmentIds },
          userId,
        },
        select: { id: true },
      });

      if (uploads.length !== attachmentIds.length) {
        return NextResponse.json(
          { error: "Invalid attachments" },
          { status: 400 },
        );
      }

      await prisma.commentAttachment.createMany({
        data: attachmentIds.map((uploadId) => ({
          uploadId,
          commentId: comment.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ id: comment.id });
  } catch (error) {
    return handleRouteError("Failed to create comment", error);
  }
}
