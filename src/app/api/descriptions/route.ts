import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TARGET_TYPES = ["section", "course", "teacher", "homework"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

const prismaAny = prisma as typeof prisma & {
  description: any;
  descriptionEdit: any;
  section: any;
  course: any;
  teacher: any;
  homework: any;
};

function parseIntParam(value: string | null) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getTargetWhere(targetType: TargetType, targetId: number | string) {
  switch (targetType) {
    case "section":
      return typeof targetId === "number" ? { sectionId: targetId } : null;
    case "course":
      return typeof targetId === "number" ? { courseId: targetId } : null;
    case "teacher":
      return typeof targetId === "number" ? { teacherId: targetId } : null;
    case "homework":
      return typeof targetId === "string" ? { homeworkId: targetId } : null;
    default:
      return null;
  }
}

async function ensureTargetExists(
  targetType: TargetType,
  targetId: number | string,
) {
  if (targetType === "section") {
    return prismaAny.section.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "course") {
    return prismaAny.course.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "teacher") {
    return prismaAny.teacher.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  return prismaAny.homework.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType") as TargetType | null;
  const targetIdParam = searchParams.get("targetId");
  const targetId =
    targetType === "homework"
      ? targetIdParam
      : parseIntParam(searchParams.get("targetId"));

  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  if (!targetId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const whereTarget = getTargetWhere(targetType, targetId);
  if (!whereTarget) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  try {
    const [viewer, description] = await Promise.all([
      getViewerContext({ includeAdmin: false }),
      prismaAny.description.findFirst({
        where: whereTarget,
        include: {
          lastEditedBy: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      }),
    ]);

    const history = description
      ? await prismaAny.descriptionEdit.findMany({
          where: { descriptionId: description.id },
          include: {
            editor: {
              select: { id: true, name: true, image: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [];

    return NextResponse.json({
      description: description
        ? {
            id: description.id,
            content: description.content ?? "",
            updatedAt: description.updatedAt?.toISOString() ?? null,
            lastEditedAt: description.lastEditedAt?.toISOString() ?? null,
            lastEditedBy: description.lastEditedBy ?? null,
          }
        : {
            id: null,
            content: "",
            updatedAt: null,
            lastEditedAt: null,
            lastEditedBy: null,
          },
      history: history.map((entry: any) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        previousContent: entry.previousContent ?? null,
        nextContent: entry.nextContent ?? "",
        editor: entry.editor ?? null,
      })),
      viewer,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch description", error);
  }
}

export async function POST(request: Request) {
  let body: {
    targetType?: TargetType;
    targetId?: number | string;
    content?: string;
  } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid description request", error, 400);
  }

  const targetType = body.targetType;
  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const targetId =
    targetType === "homework"
      ? typeof body.targetId === "string"
        ? body.targetId.trim()
        : null
      : typeof body.targetId === "number"
        ? body.targetId
        : typeof body.targetId === "string"
          ? parseInt(body.targetId, 10)
          : null;

  if (!targetId || (typeof targetId === "number" && Number.isNaN(targetId))) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : null;
  if (content === null) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return NextResponse.json(
      { error: "Suspended", reason: suspension.reason ?? null },
      { status: 403 },
    );
  }

  const whereTarget = getTargetWhere(targetType, targetId);
  if (!whereTarget) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  try {
    const target = await ensureTargetExists(targetType, targetId);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const result = await prismaAny.$transaction(async (tx) => {
      const txAny = tx as typeof prismaAny;
      const existing = await txAny.description.findFirst({
        where: whereTarget,
      });
      if (existing && existing.content === content) {
        return { id: existing.id, updated: false };
      }

      const description = existing
        ? await txAny.description.update({
            where: { id: existing.id },
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
            },
          })
        : await txAny.description.create({
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
              ...whereTarget,
            },
          });

      await txAny.descriptionEdit.create({
        data: {
          descriptionId: description.id,
          editorId: userId,
          previousContent: existing?.content ?? null,
          nextContent: content,
        },
      });

      return { id: description.id, updated: true };
    });

    return NextResponse.json({ id: result.id, updated: result.updated });
  } catch (error) {
    return handleRouteError("Failed to update description", error);
  }
}
