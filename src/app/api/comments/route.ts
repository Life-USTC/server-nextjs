import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
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

function parseIntParam(value: string | null) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeId(value: unknown) {
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType") as TargetType | null;

  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const targetIdParam = searchParams.get("targetId");
  const targetId = parseIntParam(targetIdParam);
  const sectionId = parseIntParam(searchParams.get("sectionId"));
  const teacherId = parseIntParam(searchParams.get("teacherId"));

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
  let body: {
    targetType?: TargetType;
    targetId?: number | string;
    sectionId?: number;
    teacherId?: number;
    body?: string;
    visibility?: Visibility;
    isAnonymous?: boolean;
    parentId?: string | null;
    attachmentIds?: string[];
  } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid comment request", error, 400);
  }

  const targetType = body.targetType;
  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (content.length > 8000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  const visibility =
    body.visibility && VISIBILITY_VALUES.includes(body.visibility)
      ? body.visibility
      : "public";
  const isAnonymous = body.isAnonymous === true;

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
    const normalizedTargetId = normalizeId(body.targetId);
    const normalizedHomeworkId =
      typeof body.targetId === "string" && body.targetId.trim().length > 0
        ? body.targetId.trim()
        : null;
    const normalizedSectionId = normalizeId(body.sectionId);
    const normalizedTeacherId = normalizeId(body.teacherId);
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
    if (body.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: body.parentId },
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

    const attachmentIds = Array.isArray(body.attachmentIds)
      ? body.attachmentIds.filter((id) => typeof id === "string")
      : [];

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
