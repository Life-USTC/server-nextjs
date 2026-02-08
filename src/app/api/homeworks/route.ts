import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { handleRouteError } from "@/lib/api-helpers";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseIntParam(value: string | null) {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionId = parseIntParam(searchParams.get("sectionId"));
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  if (!sectionId) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  try {
    const viewer = await getViewerContext({ includeAdmin: true });
    const homeworkInclude = {
      description: true,
      createdBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      updatedBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      deletedBy: {
        select: { id: true, name: true, username: true, image: true },
      },
      ...(viewer.userId
        ? {
            homeworkCompletions: {
              where: { userId: viewer.userId },
              select: { completedAt: true },
            },
          }
        : {}),
    } satisfies Prisma.HomeworkInclude;

    const [homeworks, auditLogs] = await Promise.all([
      prisma.homework.findMany({
        where: {
          sectionId,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        include: homeworkInclude,
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      }),
      prisma.homeworkAuditLog.findMany({
        where: { sectionId },
        include: {
          actor: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const responseHomeworks = homeworks.map((homework) => {
      const { homeworkCompletions, ...rest } = homework;
      return {
        ...rest,
        completion: homeworkCompletions?.[0] ?? null,
      };
    });

    return NextResponse.json({
      viewer,
      homeworks: responseHomeworks,
      auditLogs,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch homeworks", error);
  }
}

export async function POST(request: Request) {
  let body: {
    sectionId?: number;
    title?: string;
    description?: string;
    publishedAt?: string | null;
    submissionStartAt?: string | null;
    submissionDueAt?: string | null;
    isMajor?: boolean;
    requiresTeam?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid homework request", error, 400);
  }

  const sectionId =
    typeof body.sectionId === "number"
      ? body.sectionId
      : typeof body.sectionId === "string"
        ? parseInt(body.sectionId, 10)
        : null;

  if (!sectionId || Number.isNaN(sectionId)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 4000) {
    return NextResponse.json(
      { error: "Description too long" },
      { status: 400 },
    );
  }

  const publishedAt = parseDateValue(body.publishedAt);
  const submissionStartAt = parseDateValue(body.submissionStartAt);
  const submissionDueAt = parseDateValue(body.submissionDueAt);

  if (publishedAt === undefined) {
    return NextResponse.json(
      { error: "Invalid publish date" },
      { status: 400 },
    );
  }
  if (submissionStartAt === undefined) {
    return NextResponse.json(
      { error: "Invalid submission start" },
      { status: 400 },
    );
  }
  if (submissionDueAt === undefined) {
    return NextResponse.json(
      { error: "Invalid submission due" },
      { status: 400 },
    );
  }

  if (
    submissionStartAt &&
    submissionDueAt &&
    submissionStartAt.getTime() > submissionDueAt.getTime()
  ) {
    return NextResponse.json(
      { error: "Submission start must be before due" },
      { status: 400 },
    );
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

  try {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const homework = await tx.homework.create({
        data: {
          sectionId,
          title,
          isMajor: body.isMajor === true,
          requiresTeam: body.requiresTeam === true,
          publishedAt,
          submissionStartAt,
          submissionDueAt,
          createdById: userId,
          updatedById: userId,
        },
      });

      if (description) {
        const descriptionRecord = await tx.description.create({
          data: {
            content: description,
            lastEditedAt: new Date(),
            lastEditedById: userId,
            homeworkId: homework.id,
          },
        });

        await tx.descriptionEdit.create({
          data: {
            descriptionId: descriptionRecord.id,
            editorId: userId,
            previousContent: null,
            nextContent: description,
          },
        });
      }

      await tx.homeworkAuditLog.create({
        data: {
          action: "created",
          sectionId,
          homeworkId: homework.id,
          actorId: userId,
          titleSnapshot: title,
        },
      });

      return homework;
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    return handleRouteError("Failed to create homework", error);
  }
}
