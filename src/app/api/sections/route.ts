import type { NextRequest } from "next/server";
import {
  getPagination,
  handleRouteError,
  paginateResult,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);

  const courseId = searchParams.get("courseId");
  const semesterId = searchParams.get("semesterId");
  const campusId = searchParams.get("campusId");
  const departmentId = searchParams.get("departmentId");
  const teacherId = searchParams.get("teacherId");

  const whereClause: Record<string, unknown> = {};
  if (courseId) whereClause.courseId = parseInt(courseId, 10);
  if (semesterId) whereClause.semesterId = parseInt(semesterId, 10);
  if (campusId) whereClause.campusId = parseInt(campusId, 10);
  if (departmentId) whereClause.openDepartmentId = parseInt(departmentId, 10);
  if (teacherId) {
    whereClause.teachers = {
      some: {
        id: parseInt(teacherId, 10),
      },
    };
  }

  try {
    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where: whereClause,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          course: {
            include: {
              educationLevel: true,
              category: true,
              classify: true,
              classType: true,
              gradation: true,
              type: true,
            },
          },
          semester: true,
          campus: true,
          openDepartment: true,
          examMode: true,
          teachLanguage: true,
          teachers: true,
          adminClasses: true,
        },
      }),
      prisma.section.count({ where: whereClause }),
    ]);

    return paginateResult(sections, pagination, total);
  } catch (error) {
    return handleRouteError("Failed to fetch sections", error);
  }
}
