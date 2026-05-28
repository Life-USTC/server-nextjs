import type { Prisma } from "@/generated/prisma/client";
import {
  applyIntegerFilter,
  buildJwIdFilter,
  buildRelatedFilter,
  type IntegerFilter,
  parseIdsFilter,
} from "@/lib/query-filter-helpers";
import { buildSectionSearchWhere, ilike } from "@/lib/query-helpers";

type CourseListFilters = {
  search?: string | null;
  educationLevelId?: IntegerFilter;
  categoryId?: IntegerFilter;
  classTypeId?: IntegerFilter;
};

type SectionListFilters = {
  courseId?: IntegerFilter;
  courseJwId?: IntegerFilter;
  semesterId?: IntegerFilter;
  semesterJwId?: IntegerFilter;
  campusId?: IntegerFilter;
  departmentId?: IntegerFilter;
  teacherId?: IntegerFilter;
  teacherCode?: string | null;
  ids?: number[] | string | null;
  jwIds?: number[] | string | null;
  search?: string | null;
};

// IntegerFilter, parseIdsFilter, applyIntegerFilter, buildRelatedFilter, buildJwIdFilter
// are now exported from @/lib/query-filter-helpers.ts

export function buildCourseListWhere(
  filters: CourseListFilters,
): Prisma.CourseWhereInput | undefined {
  const { search, educationLevelId, categoryId, classTypeId } = filters;
  const where: Prisma.CourseWhereInput = {};

  if (search) {
    where.OR = [
      { nameCn: ilike(search) },
      { nameEn: ilike(search) },
      { code: ilike(search) },
    ];
  }

  applyIntegerFilter(where, "educationLevelId", educationLevelId);
  applyIntegerFilter(where, "categoryId", categoryId);
  applyIntegerFilter(where, "classTypeId", classTypeId);

  return Object.keys(where).length > 0 ? where : undefined;
}

export function buildSectionListQuery(filters: SectionListFilters): {
  where: Prisma.SectionWhereInput;
  orderBy?: ReturnType<typeof buildSectionSearchWhere>["orderBy"];
} {
  const {
    courseId,
    courseJwId,
    semesterId,
    semesterJwId,
    campusId,
    departmentId,
    teacherId,
    teacherCode,
    ids,
    jwIds,
    search,
  } = filters;
  const where: Prisma.SectionWhereInput = {};

  applyIntegerFilter(where, "courseId", courseId);
  const courseFilter = buildJwIdFilter(courseJwId);
  if (courseFilter) {
    where.course = courseFilter;
  }

  applyIntegerFilter(where, "semesterId", semesterId);
  const semesterFilter = buildJwIdFilter(semesterJwId);
  if (semesterFilter) {
    where.semester = semesterFilter;
  }

  applyIntegerFilter(where, "campusId", campusId);
  applyIntegerFilter(where, "openDepartmentId", departmentId);

  const teacherFilter = buildRelatedFilter("id", teacherId, teacherCode);
  if (teacherFilter) {
    where.teachers = {
      some: teacherFilter,
    };
  }

  const parsedIds = parseIdsFilter(ids);
  if (parsedIds.length > 0) {
    where.id = { in: parsedIds };
  }
  const parsedJwIds = parseIdsFilter(jwIds);
  if (parsedJwIds.length > 0) {
    where.jwId = { in: parsedJwIds };
  }

  const searchFilters = buildSectionSearchWhere(search ?? undefined);
  if (searchFilters.where?.AND) {
    const searchAnd = Array.isArray(searchFilters.where.AND)
      ? searchFilters.where.AND
      : [searchFilters.where.AND];
    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];
    where.AND = [...existingAnd, ...searchAnd];
  }

  return {
    where,
    orderBy: searchFilters.orderBy,
  };
}
