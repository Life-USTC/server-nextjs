import { requireAdmin } from "@/lib/admin-utils";
import {
  handleRouteError,
  jsonResponse,
  parseOptionalInt,
  unauthorized,
} from "@/lib/api/helpers";
import { adminHomeworksQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const parsed = parseOptionalInt(value);
  if (!parsed) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

/**
 * List moderation homeworks.
 * @params adminHomeworksQuerySchema
 * @response adminHomeworksResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = adminHomeworksQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError(
      "Invalid homework moderation query",
      parsedQuery.error,
      400,
    );
  }

  const status = parsedQuery.data.status ?? "all";
  const limit = parseLimit(parsedQuery.data.limit ?? null);
  const search = parsedQuery.data.search?.trim() ?? "";

  const deletedAtFilter =
    status === "active"
      ? { deletedAt: null }
      : status === "deleted"
        ? { deletedAt: { not: null } }
        : {};

  const searchFilter = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          {
            section: {
              code: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            section: {
              course: {
                code: { contains: search, mode: "insensitive" as const },
              },
            },
          },
          {
            section: {
              course: {
                nameCn: { contains: search, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};

  try {
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
  } catch (error) {
    return handleRouteError("Failed to fetch homework moderation queue", error);
  }
}
