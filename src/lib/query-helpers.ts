import type { Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  normalizePagination,
  type PaginatedResponse,
} from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

/**
 * Generic paginated query function for Prisma models
 */
export async function paginatedQuery<TData>(
  queryFn: (skip: number, take: number) => Promise<TData[]>,
  countFn: () => Promise<number>,
  page: number,
  pageSize?: number,
): Promise<PaginatedResponse<TData>> {
  const normalized = normalizePagination({ page, pageSize });

  const [data, total] = await Promise.all([
    queryFn(normalized.skip, normalized.pageSize),
    countFn(),
  ]);

  return buildPaginatedResponse(
    data,
    normalized.page,
    normalized.pageSize,
    total,
  );
}

/**
 * Helper to build common include objects for sections
 */
export const sectionInclude = {
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
} satisfies Prisma.SectionInclude;

/**
 * Helper to build common include objects for courses
 */
export const courseInclude = {
  educationLevel: true,
  category: true,
  classify: true,
  classType: true,
  gradation: true,
  type: true,
} satisfies Prisma.CourseInclude;

export function paginatedSectionQuery(
  page: number,
  where?: Prisma.SectionWhereInput,
  orderBy?:
    | Prisma.SectionOrderByWithRelationInput
    | Prisma.SectionOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.section.findMany({
        where,
        skip,
        take,
        include: sectionInclude,
        orderBy,
      }),
    () => prisma.section.count({ where }),
    page,
  );
}

export function paginatedCourseQuery(
  page: number,
  where?: Prisma.CourseWhereInput,
  orderBy?:
    | Prisma.CourseOrderByWithRelationInput
    | Prisma.CourseOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.course.findMany({
        where,
        skip,
        take,
        include: courseInclude,
        orderBy,
      }),
    () => prisma.course.count({ where }),
    page,
  );
}

/**
 * Helper to build common include objects for teachers
 */
export const teacherInclude = {
  department: true,
  teacherTitle: true,
  sections: {
    include: {
      course: true,
      semester: true,
    },
    orderBy: {
      semester: {
        jwId: "desc" as const,
      },
    },
  },
  _count: {
    select: {
      sections: true,
    },
  },
} satisfies Prisma.TeacherInclude;

export function paginatedTeacherQuery(
  page: number,
  where?: Prisma.TeacherWhereInput,
  orderBy?:
    | Prisma.TeacherOrderByWithRelationInput
    | Prisma.TeacherOrderByWithRelationInput[],
  locale = "zh-cn",
) {
  const prisma = getPrisma(locale);
  return paginatedQuery(
    (skip, take) =>
      prisma.teacher.findMany({
        where,
        skip,
        take,
        include: teacherInclude,
        orderBy,
      }),
    () => prisma.teacher.count({ where }),
    page,
  );
}
