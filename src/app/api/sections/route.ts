import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getPagination, handleRouteError } from "@/lib/api-helpers";
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
  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id));
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
