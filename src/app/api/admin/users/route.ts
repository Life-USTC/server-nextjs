import type { NextRequest } from "next/server";
import { ADMIN_USERS_PAGE_SIZE } from "@/app/admin/users/constants";
import { withAdminRoute } from "@/lib/admin-utils";
import {
  buildPaginatedResponse,
  getPagination,
  getRequestSearchParams,
  jsonResponse,
  parseRouteInput,
} from "@/lib/api/helpers";
import { adminUsersQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { ilike } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * List users for admin console.
 * @params adminUsersQuerySchema
 * @response adminUsersResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  return withAdminRoute("Failed to fetch users", async () => {
    const searchParams = getRequestSearchParams(request);
    const parsedQuery = parseRouteInput(
      {
        search: searchParams.get("search") ?? undefined,
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      },
      adminUsersQuerySchema,
      "Invalid user query",
      { logErrors: true },
    );
    if (parsedQuery instanceof Response) {
      return parsedQuery;
    }

    const pagination = getPagination(searchParams, {
      defaultPageSize: ADMIN_USERS_PAGE_SIZE,
      maxPageSize: 100,
    });
    const search = parsedQuery.search ?? "";
    const where = search
      ? {
          OR: [
            { id: ilike(search) },
            { name: ilike(search) },
            { username: ilike(search) },
            {
              verifiedEmails: {
                some: {
                  email: ilike(search),
                },
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          isAdmin: true,
          createdAt: true,
          verifiedEmails: {
            select: { email: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return jsonResponse(
      buildPaginatedResponse(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          isAdmin: u.isAdmin,
          email: u.verifiedEmails?.[0]?.email ?? null,
          createdAt: u.createdAt,
        })),
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  });
}
