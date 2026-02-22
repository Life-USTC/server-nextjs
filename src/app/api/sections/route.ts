import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  getPagination,
  handleRouteError,
  parseIntegerList,
  parseOptionalInt,
} from "@/lib/api-helpers";
import { sectionsQuerySchema } from "@/lib/api-schemas";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = sectionsQuerySchema.safeParse({
    courseId: searchParams.get("courseId") ?? undefined,
    semesterId: searchParams.get("semesterId") ?? undefined,
    campusId: searchParams.get("campusId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    teacherId: searchParams.get("teacherId") ?? undefined,
    ids: searchParams.get("ids") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid section query", parsedQuery.error, 400);
  }

  const pagination = getPagination(searchParams);
  const {
    courseId,
    semesterId,
    campusId,
    departmentId,
    teacherId,
    ids: idsParam,
  } = parsedQuery.data;

  const where: Prisma.SectionWhereInput = {};
  const parsedCourseId = parseOptionalInt(courseId);
  if (parsedCourseId !== null) where.courseId = parsedCourseId;
  const parsedSemesterId = parseOptionalInt(semesterId);
  if (parsedSemesterId !== null) where.semesterId = parsedSemesterId;
  const parsedCampusId = parseOptionalInt(campusId);
  if (parsedCampusId !== null) where.campusId = parsedCampusId;
  const parsedDepartmentId = parseOptionalInt(departmentId);
  if (parsedDepartmentId !== null) where.openDepartmentId = parsedDepartmentId;
  if (teacherId) {
    const parsedTeacherId = parseOptionalInt(teacherId);
    if (parsedTeacherId !== null) {
      where.teachers = {
        some: {
          id: parsedTeacherId,
        },
      };
    }
  }
  if (idsParam) {
    const ids = parseIntegerList(idsParam);
    if (ids.length > 0) {
      where.id = { in: ids };
    }
  }

  try {
    const result = await paginatedSectionQuery(pagination.page, where);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
