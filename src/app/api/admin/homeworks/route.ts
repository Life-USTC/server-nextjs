import { withAdminRoute } from "@/lib/admin-utils";
import {
  getPagination,
  getRequestSearchParams,
  jsonResponse,
  parseRouteInput,
} from "@/lib/api/helpers";
import { adminHomeworksQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { ilike } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * List moderation homeworks.
 * @params adminHomeworksQuerySchema
 * @response adminHomeworksResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  return withAdminRoute(
    "Failed to fetch homework moderation queue",
    async () => {
      const searchParams = getRequestSearchParams(request);
      const parsedQuery = parseRouteInput(
        {
          status: searchParams.get("status") ?? undefined,
          limit: searchParams.get("limit") ?? undefined,
          search: searchParams.get("search") ?? undefined,
        },
        adminHomeworksQuerySchema,
        "Invalid homework moderation query",
        { logErrors: true },
      );
      if (parsedQuery instanceof Response) {
        return parsedQuery;
      }

      const status = parsedQuery.status ?? "all";
      const { pageSize: limit } = getPagination(searchParams, {
        defaultPageSize: 50,
        maxPageSize: 200,
      });
      const search = parsedQuery.search?.trim() ?? "";

      const deletedAtFilter =
        status === "active"
          ? { deletedAt: null }
          : status === "deleted"
            ? { deletedAt: { not: null } }
            : {};

      const searchFilter = search
        ? {
            OR: [
              { title: ilike(search) },
              {
                section: {
                  code: ilike(search),
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
            ],
          }
        : {};

      const homeworks = await prisma.homework.findMany({
        where: {
          ...deletedAtFilter,
          ...searchFilter,
        },
        include: {
          section: {
            select: {
              id: true,
              jwId: true,
              code: true,
              course: { select: { jwId: true, code: true, nameCn: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          updatedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          deletedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: [{ deletedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
      });

      return jsonResponse({ homeworks });
    },
  );
}
