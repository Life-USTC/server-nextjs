import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  getPagination,
  handleRouteError,
  parseIntegerList,
  parseOptionalInt,
} from "@/lib/api-helpers";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);

  const courseId = searchParams.get("courseId");
  const semesterId = searchParams.get("semesterId");
  const campusId = searchParams.get("campusId");
  const departmentId = searchParams.get("departmentId");
  const teacherId = searchParams.get("teacherId");
  const idsParam = searchParams.get("ids");

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
