import {
  findActiveSuspension,
  getViewerContext,
} from "@/features/comments/server/comment-utils";
import type { Prisma } from "@/generated/prisma/client";
import {
  badRequest,
  handleRouteError,
  jsonResponse,
  notFound,
  parseOptionalInt,
  unauthorized,
} from "@/lib/api/helpers";
import {
  homeworkCreateRequestSchema,
  homeworksQuerySchema,
} from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/time/parse-date-input";
export const dynamic = "force-dynamic";

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
    const viewerUserId = await resolveApiUserId(request);
    const viewer = await getViewerContext({
      includeAdmin: true,
      userId: viewerUserId,
    });
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
    const homeworkIds = homeworks.map((homework) => homework.id);
    const commentCountRows =
      homeworkIds.length > 0
        ? await prisma.comment.groupBy({
            by: ["homeworkId"],
            where: {
              homeworkId: { in: homeworkIds },
              status: { not: "deleted" },
            },
            _count: { _all: true },
          })
        : [];
    const commentCounts = new Map(
      commentCountRows.flatMap((row) =>
        row.homeworkId ? [[row.homeworkId, row._count._all] as const] : [],
      ),
    );

    const responseHomeworks = homeworks.map((homework) => {
      const { homeworkCompletions, ...rest } = homework;
      return {
        ...rest,
        completion: homeworkCompletions?.[0] ?? null,
        commentCount: commentCounts.get(homework.id) ?? 0,
      };
    });

    return jsonResponse({
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

  const publishedAt = parseDateInput(parsedBody.data.publishedAt);
  const submissionStartAt = parseDateInput(parsedBody.data.submissionStartAt);
  const submissionDueAt = parseDateInput(parsedBody.data.submissionDueAt);

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

  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return jsonResponse(
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

    return jsonResponse({ id: result.id });
  } catch (error) {
    return handleRouteError("Failed to create homework", error);
  }
}
