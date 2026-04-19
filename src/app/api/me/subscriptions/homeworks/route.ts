import { getViewerContext } from "@/features/comments/server/comment-utils";
import type { Prisma } from "@/generated/prisma/client";
import {
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { getPrisma, prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * List homeworks for all subscribed sections in a single call.
 * @response subscribedHomeworksResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  try {
    const viewer = await getViewerContext({
      includeAdmin: true,
      userId,
    });

    // Single query: get user's subscribed section IDs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscribedSections: { select: { id: true } },
      },
    });

    const sectionIds = user?.subscribedSections.map((s) => s.id) ?? [];

    if (sectionIds.length === 0) {
      return jsonResponse({
        viewer,
        homeworks: [],
        auditLogs: [],
        sectionIds: [],
      });
    }

    const sectionFilter = { sectionId: { in: sectionIds } };

    const homeworkInclude = {
      section: {
        include: {
          course: true,
          semester: true,
        },
      },
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
      homeworkCompletions: {
        where: { userId },
        select: { completedAt: true },
      },
    } satisfies Prisma.HomeworkInclude;

    // Parallel queries: homeworks + audit logs + comment counts
    const [homeworks, auditLogs] = await Promise.all([
      getPrisma("zh-cn").homework.findMany({
        where: { ...sectionFilter, deletedAt: null },
        include: homeworkInclude,
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      }),
      prisma.homeworkAuditLog.findMany({
        where: sectionFilter,
        include: {
          actor: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const homeworkIds = homeworks.map((h) => h.id);
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
      sectionIds,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch subscribed homeworks", error);
  }
}
