import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError, parseOptionalInt } from "@/lib/api-helpers";
import {
  descriptionsQuerySchema,
  descriptionUpsertRequestSchema,
} from "@/lib/api-schemas";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TARGET_TYPES = ["section", "course", "teacher", "homework"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

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
  if (targetType === "section" && typeof targetId === "number") {
    return prisma.section.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "course" && typeof targetId === "number") {
    return prisma.course.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "teacher" && typeof targetId === "number") {
    return prisma.teacher.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "homework" && typeof targetId === "string") {
    return prisma.homework.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = descriptionsQuerySchema.safeParse({
    targetType: searchParams.get("targetType"),
    targetId: searchParams.get("targetId") ?? "",
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const targetType = parsedQuery.data.targetType as TargetType;
  const targetIdParam = parsedQuery.data.targetId;
  const targetId =
    targetType === "homework" ? targetIdParam : parseOptionalInt(targetIdParam);

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
      prisma.description.findFirst({
        where: whereTarget,
        include: {
          lastEditedBy: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      }),
    ]);

    const history = description
      ? await prisma.descriptionEdit.findMany({
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
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid description request", error, 400);
  }

  const parsedBody = descriptionUpsertRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid description request",
      parsedBody.error,
      400,
    );
  }

  const targetType = parsedBody.data.targetType;
  const rawTargetId = parsedBody.data.targetId;

  const targetId =
    targetType === "homework"
      ? typeof rawTargetId === "string"
        ? rawTargetId.trim()
        : null
      : parseOptionalInt(rawTargetId);

  if (!targetId) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const content = parsedBody.data.content.trim();

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

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.description.findFirst({
        where: whereTarget,
      });
      if (existing && existing.content === content) {
        return { id: existing.id, updated: false };
      }

      const description = existing
        ? await tx.description.update({
            where: { id: existing.id },
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
            },
          })
        : await tx.description.create({
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
              ...whereTarget,
            },
          });

      await tx.descriptionEdit.create({
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
