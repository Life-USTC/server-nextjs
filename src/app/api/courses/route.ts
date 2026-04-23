import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  getPagination,
  handleRouteError,
  jsonResponse,
} from "@/lib/api/helpers";
import { coursesQuerySchema } from "@/lib/api/schemas/request-schemas";
import { ilike, paginatedCourseQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * List courses with search and pagination.
 * @params coursesQuerySchema
 * @response paginatedCourseResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = coursesQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    educationLevelId: searchParams.get("educationLevelId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    classTypeId: searchParams.get("classTypeId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid course query", parsedQuery.error, 400);
  }

  const pagination = getPagination(searchParams);
  const { search, educationLevelId, categoryId, classTypeId } =
    parsedQuery.data;

  const where: Prisma.CourseWhereInput = {};

  if (search) {
    where.OR = [
      { nameCn: ilike(search) },
      { nameEn: ilike(search) },
      { code: ilike(search) },
    ];
  }

  if (educationLevelId) {
    const parsedEducationLevelId = Number.parseInt(educationLevelId, 10);
    if (!Number.isNaN(parsedEducationLevelId)) {
      where.educationLevelId = parsedEducationLevelId;
    }
  }

  if (categoryId) {
    const parsedCategoryId = Number.parseInt(categoryId, 10);
    if (!Number.isNaN(parsedCategoryId)) {
      where.categoryId = parsedCategoryId;
    }
  }

  if (classTypeId) {
    const parsedClassTypeId = Number.parseInt(classTypeId, 10);
    if (!Number.isNaN(parsedClassTypeId)) {
      where.classTypeId = parsedClassTypeId;
    }
  }

  try {
    const result = await paginatedCourseQuery(
      pagination.page,
      Object.keys(where).length > 0 ? where : undefined,
    );
    return jsonResponse(result);
  } catch (error) {
    return handleRouteError("Failed to fetch courses", error);
  }
}
