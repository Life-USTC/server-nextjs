import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
  unauthorized,
} from "@/lib/api/helpers";
import { adminDescriptionsQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const TARGET_TYPE_FILTERS = [
  "section",
  "course",
  "teacher",
  "homework",
] as const;

type DescriptionTargetTypeFilter =
  | (typeof TARGET_TYPE_FILTERS)[number]
  | undefined;

function buildTargetTypeWhere(
  targetType: DescriptionTargetTypeFilter,
): Prisma.DescriptionWhereInput {
  if (!targetType) return {};
  switch (targetType) {
    case "section":
      return { sectionId: { not: null } };
    case "course":
      return { courseId: { not: null } };
    case "teacher":
      return { teacherId: { not: null } };
    case "homework":
      return { homeworkId: { not: null } };
    default:
      return {};
  }
}

/**
 * List recently edited descriptions for admin moderation.
 * @params adminDescriptionsQuerySchema
 * @response adminDescriptionsPaginatedResponseSchema
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
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError(
      "Invalid descriptions query",
      parsedQuery.error,
      400,
    );
  }

  const targetType = parsedQuery.data.targetType as DescriptionTargetTypeFilter;
  const pagination = getPagination(searchParams);

  const where: Prisma.DescriptionWhereInput = {
    ...buildTargetTypeWhere(targetType),
    content: { not: "" },
    lastEditedById: { not: null },
  };

  try {
    const [descriptions, total] = await Promise.all([
      prisma.description.findMany({
        where,
        select: {
          id: true,
          content: true,
          lastEditedAt: true,
          updatedAt: true,
          createdAt: true,
          lastEditedById: true,
          sectionId: true,
          courseId: true,
          teacherId: true,
          homeworkId: true,
          lastEditedBy: {
            select: { id: true, name: true },
          },
          section: {
            select: { jwId: true, code: true },
          },
          course: {
            select: { jwId: true, code: true, nameCn: true },
          },
          teacher: {
            select: { id: true, nameCn: true },
          },
          homework: {
            select: { id: true, title: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      prisma.description.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(
        descriptions.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          lastEditedAt: d.lastEditedAt?.toISOString() ?? null,
        })),
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch descriptions", error);
  }
}
