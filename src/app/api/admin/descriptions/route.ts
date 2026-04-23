import { requireAdmin } from "@/lib/admin-utils";
import {
  handleRouteError,
  jsonResponse,
  parseOptionalInt,
  unauthorized,
} from "@/lib/api/helpers";
import { adminDescriptionsQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { ilike } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const parsed = parseOptionalInt(value);
  if (!parsed) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

/**
 * List descriptions for moderation review.
 * @params adminDescriptionsQuerySchema
 * @response adminDescriptionsResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = adminDescriptionsQuerySchema.safeParse({
    targetType: searchParams.get("targetType") ?? undefined,
    hasContent: searchParams.get("hasContent") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError(
      "Invalid descriptions moderation query",
      parsedQuery.error,
      400,
    );
  }

  const targetType = parsedQuery.data.targetType ?? "all";
  const hasContent = parsedQuery.data.hasContent ?? "withContent";
  const search = parsedQuery.data.search?.trim() ?? "";
  const limit = parseLimit(parsedQuery.data.limit ?? null);

  const targetTypeWhere =
    targetType === "section"
      ? { sectionId: { not: null } }
      : targetType === "course"
        ? { courseId: { not: null } }
        : targetType === "teacher"
          ? { teacherId: { not: null } }
          : targetType === "homework"
            ? { homeworkId: { not: null } }
            : {};

  const contentWhere =
    hasContent === "empty"
      ? { content: "" }
      : hasContent === "withContent"
        ? { content: { not: "" } }
        : {};

  const searchWhere = search
    ? {
        OR: [
          { content: ilike(search) },
          {
            course: {
              code: ilike(search),
            },
          },
          {
            course: {
              nameCn: ilike(search),
            },
          },
          {
            section: {
              course: {
                code: ilike(search),
              },
            },
          },
          {
            section: {
              course: {
                nameCn: ilike(search),
              },
            },
          },
          {
            section: {
              code: ilike(search),
            },
          },
          {
            teacher: {
              nameCn: ilike(search),
            },
          },
          {
            homework: {
              title: ilike(search),
            },
          },
          {
            homework: {
              section: {
                course: {
                  code: ilike(search),
                },
              },
            },
          },
          {
            homework: {
              section: {
                course: {
                  nameCn: ilike(search),
                },
              },
            },
          },
        ],
      }
    : {};

  try {
    const descriptions = await prisma.description.findMany({
      where: {
        ...targetTypeWhere,
        ...contentWhere,
        ...searchWhere,
      },
      include: {
        lastEditedBy: {
          select: { id: true, name: true, username: true, image: true },
        },
        section: {
          select: {
            jwId: true,
            code: true,
            course: { select: { jwId: true, code: true, nameCn: true } },
          },
        },
        course: { select: { jwId: true, code: true, nameCn: true } },
        teacher: { select: { id: true, nameCn: true } },
        homework: {
          select: {
            id: true,
            title: true,
            section: {
              select: {
                jwId: true,
                code: true,
                course: { select: { jwId: true, code: true, nameCn: true } },
              },
            },
          },
        },
      },
      orderBy: [{ lastEditedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return jsonResponse({ descriptions });
  } catch (error) {
    return handleRouteError(
      "Failed to fetch descriptions moderation queue",
      error,
    );
  }
}
