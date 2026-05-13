import { parseInteger, parseIntegerList } from "@/lib/api/helpers";
import { buildSectionSearchWhere, ilike } from "@/lib/query-helpers";

type IntegerFilter = number | string | null | undefined;

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

const parseIntegerFilter = (value: IntegerFilter) => parseInteger(value);

const parseIdsFilter = (value: number[] | string | null | undefined) => {
  if (Array.isArray(value)) {
    return value.filter(Number.isInteger);
  }
  return parseIntegerList(value);
};

export function buildCourseListWhere(filters: CourseListFilters) {
  const { search, educationLevelId, categoryId, classTypeId } = filters;
  const where: {
    OR?: Array<Record<string, unknown>>;
    educationLevelId?: number;
    categoryId?: number;
    classTypeId?: number;
  } = {};

  if (search) {
    where.OR = [
      { nameCn: ilike(search) },
      { nameEn: ilike(search) },
      { code: ilike(search) },
    ];
  }

  const parsedEducationLevelId = parseIntegerFilter(educationLevelId);
  if (parsedEducationLevelId !== null) {
    where.educationLevelId = parsedEducationLevelId;
  }

  const parsedCategoryId = parseIntegerFilter(categoryId);
  if (parsedCategoryId !== null) {
    where.categoryId = parsedCategoryId;
  }

  const parsedClassTypeId = parseIntegerFilter(classTypeId);
  if (parsedClassTypeId !== null) {
    where.classTypeId = parsedClassTypeId;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function buildSectionListQuery(filters: SectionListFilters): {
  where: Record<string, unknown>;
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
  const where: Record<string, unknown> = {};

  const parsedCourseId = parseIntegerFilter(courseId);
  if (parsedCourseId !== null) {
    where.courseId = parsedCourseId;
  }
  const courseFilter: { jwId?: number } = {};
  const parsedCourseJwId = parseIntegerFilter(courseJwId);
  if (parsedCourseJwId !== null) {
    courseFilter.jwId = parsedCourseJwId;
  }
  if (Object.keys(courseFilter).length > 0) {
    where.course = courseFilter;
  }

  const parsedSemesterId = parseIntegerFilter(semesterId);
  if (parsedSemesterId !== null) {
    where.semesterId = parsedSemesterId;
  }
  const semesterFilter: { jwId?: number } = {};
  const parsedSemesterJwId = parseIntegerFilter(semesterJwId);
  if (parsedSemesterJwId !== null) {
    semesterFilter.jwId = parsedSemesterJwId;
  }
  if (Object.keys(semesterFilter).length > 0) {
    where.semester = semesterFilter;
  }

  const parsedCampusId = parseIntegerFilter(campusId);
  if (parsedCampusId !== null) {
    where.campusId = parsedCampusId;
  }

  const parsedDepartmentId = parseIntegerFilter(departmentId);
  if (parsedDepartmentId !== null) {
    where.openDepartmentId = parsedDepartmentId;
  }

  const teacherFilter: { id?: number; code?: string } = {};
  const parsedTeacherId = parseIntegerFilter(teacherId);
  if (parsedTeacherId !== null) {
    teacherFilter.id = parsedTeacherId;
  }
  const trimmedTeacherCode = teacherCode?.trim();
  if (trimmedTeacherCode) {
    teacherFilter.code = trimmedTeacherCode;
  }
  if (Object.keys(teacherFilter).length > 0) {
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
