import type { NextRequest } from "next/server";
import {
  getPagination,
  handleRouteError,
  jsonResponse,
} from "@/lib/api/helpers";
import { sectionsQuerySchema } from "@/lib/api/schemas/request-schemas";
import { buildSectionListQuery } from "@/lib/course-section-queries";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * List sections with filters and pagination.
 * @params sectionsQuerySchema
 * @response paginatedSectionResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = sectionsQuerySchema.safeParse({
    courseId: searchParams.get("courseId") ?? undefined,
    courseJwId: searchParams.get("courseJwId") ?? undefined,
    semesterId: searchParams.get("semesterId") ?? undefined,
    semesterJwId: searchParams.get("semesterJwId") ?? undefined,
    campusId: searchParams.get("campusId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    teacherId: searchParams.get("teacherId") ?? undefined,
    teacherCode: searchParams.get("teacherCode") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    ids: searchParams.get("ids") ?? undefined,
    jwIds: searchParams.get("jwIds") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid section query", parsedQuery.error, 400);
  }

  const pagination = getPagination(searchParams);
  const {
    courseId,
    courseJwId,
    semesterId,
    semesterJwId,
    campusId,
    departmentId,
    teacherId,
    teacherCode,
    search,
    ids: idsParam,
    jwIds,
  } = parsedQuery.data;
  const { where, orderBy } = buildSectionListQuery({
    courseId,
    courseJwId,
    semesterId,
    semesterJwId,
    campusId,
    departmentId,
    teacherId,
    teacherCode,
    ids: idsParam,
    jwIds,
    search,
  });

  try {
    const result = await paginatedSectionQuery(pagination.page, where, orderBy);
    return jsonResponse(result);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
