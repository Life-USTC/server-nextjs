import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
import { paginatedSectionQuery } from "@/lib/query-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);

  const courseId = searchParams.get("courseId");
  const semesterId = searchParams.get("semesterId");
  const campusId = searchParams.get("campusId");
  const departmentId = searchParams.get("departmentId");
  const teacherId = searchParams.get("teacherId");

  const where: Prisma.SectionWhereInput = {};
  if (courseId) where.courseId = parseInt(courseId, 10);
  if (semesterId) where.semesterId = parseInt(semesterId, 10);
  if (campusId) where.campusId = parseInt(campusId, 10);
  if (departmentId) where.openDepartmentId = parseInt(departmentId, 10);
  if (teacherId) {
    where.teachers = {
      some: {
        id: parseInt(teacherId, 10),
      },
    };
  }

  try {
    const result = await paginatedSectionQuery(pagination.page, where);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
