import type { Prisma } from "@prisma/client";
import {
  buildPaginatedResponse,
  normalizePagination,
  type PaginatedResponse,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

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

/**
 * Type-safe paginated section query
 */
export type SectionWithRelations = Prisma.SectionGetPayload<{
  include: typeof sectionInclude;
}>;

export function paginatedSectionQuery(
  page: number,
  where?: Prisma.SectionWhereInput,
  orderBy?:
    | Prisma.SectionOrderByWithRelationInput
    | Prisma.SectionOrderByWithRelationInput[],
): Promise<PaginatedResponse<SectionWithRelations>> {
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

/**
 * Type-safe paginated course query
 */
export type CourseWithRelations = Prisma.CourseGetPayload<{
  include: typeof courseInclude;
}>;

export function paginatedCourseQuery(
  page: number,
  where?: Prisma.CourseWhereInput,
  orderBy?:
    | Prisma.CourseOrderByWithRelationInput
    | Prisma.CourseOrderByWithRelationInput[],
): Promise<PaginatedResponse<CourseWithRelations>> {
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
