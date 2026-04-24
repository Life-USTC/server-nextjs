import type { NextRequest } from "next/server";
import {
  getPagination,
  handleRouteError,
  jsonResponse,
} from "@/lib/api/helpers";
import { coursesQuerySchema } from "@/lib/api/schemas/request-schemas";
import { buildCourseListWhere } from "@/lib/course-section-queries";
import { paginatedCourseQuery } from "@/lib/query-helpers";

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
  const where = buildCourseListWhere({
    search,
    educationLevelId,
    categoryId,
    classTypeId,
  });

  try {
    const result = await paginatedCourseQuery(pagination.page, where);
    return jsonResponse(result);
  } catch (error) {
    return handleRouteError("Failed to fetch courses", error);
  }
}
