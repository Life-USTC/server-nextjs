import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import {
  badRequest,
  handleRouteError,
  notFound,
  parseOptionalInt,
  unauthorized,
} from "@/lib/api-helpers";
import {
  homeworkCreateRequestSchema,
  homeworksQuerySchema,
} from "@/lib/api-schemas/request-schemas";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * List homeworks by section.
 * @params homeworksQuerySchema
 * @response homeworksListResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = homeworksQuerySchema.safeParse({
    sectionId: searchParams.get("sectionId") ?? undefined,
    includeDeleted: searchParams.get("includeDeleted") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid homework query", parsedQuery.error, 400);
  }

  const sectionId = parseOptionalInt(parsedQuery.data.sectionId);
  const includeDeleted = parsedQuery.data.includeDeleted === "true";

  if (!sectionId) {
    return badRequest("Invalid section");
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

/**
 * Create one homework.
 * @body homeworkCreateRequestSchema
 * @response idResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid homework request", error, 400);
  }

  const parsedBody = homeworkCreateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid homework request", parsedBody.error, 400);
  }

  const sectionId = parseOptionalInt(parsedBody.data.sectionId);

  if (!sectionId) {
    return badRequest("Invalid section");
  }

  const title = parsedBody.data.title;
  const description = (parsedBody.data.description ?? "").trim();

  const publishedAt = parseDateValue(parsedBody.data.publishedAt);
  const submissionStartAt = parseDateValue(parsedBody.data.submissionStartAt);
  const submissionDueAt = parseDateValue(parsedBody.data.submissionDueAt);

  if (publishedAt === undefined) {
    return badRequest("Invalid publish date");
  }
  if (submissionStartAt === undefined) {
    return badRequest("Invalid submission start");
  }
  if (submissionDueAt === undefined) {
    return badRequest("Invalid submission due");
  }

  if (
    submissionStartAt &&
    submissionDueAt &&
    submissionStartAt.getTime() > submissionDueAt.getTime()
  ) {
    return badRequest("Submission start must be before due");
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
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
      return notFound("Section not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const homework = await tx.homework.create({
        data: {
          sectionId,
          title,
          isMajor: parsedBody.data.isMajor === true,
          requiresTeam: parsedBody.data.requiresTeam === true,
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
