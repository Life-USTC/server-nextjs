import type { Prisma } from "@/generated/prisma/client";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { findClosestMatches } from "@/lib/fuzzy-match";
import {
  buildSectionSearchWhere,
  courseDetailInclude,
  courseInclude,
  ilike,
  sectionCompactInclude,
  sectionInclude,
} from "@/lib/query-helpers";

type IntegerFilter = number | string | null | undefined;

type CourseListFilters = {
  search?: string | null;
  educationLevelId?: IntegerFilter;
  categoryId?: IntegerFilter;
  classTypeId?: IntegerFilter;
};

type SectionListFilters = {
  courseId?: IntegerFilter;
  semesterId?: IntegerFilter;
  campusId?: IntegerFilter;
  departmentId?: IntegerFilter;
  teacherId?: IntegerFilter;
  ids?: number[] | string | null;
  search?: string | null;
};

type MatchedSectionCodes = {
  semester: {
    id: number;
    nameCn: string;
    code: string;
  };
  matchedCodes: string[];
  unmatchedCodes: string[];
  suggestions: Record<string, string[]>;
  sections: Prisma.SectionGetPayload<{
    include: typeof sectionCompactInclude;
  }>[];
  total: number;
};

const parseIntegerFilter = (value: IntegerFilter) => {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIdsFilter = (value: number[] | string | null | undefined) => {
  if (Array.isArray(value)) {
    return value.filter(Number.isInteger);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((part) => parseIntegerFilter(part))
    .filter((id): id is number => id !== null);
};

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
  where: Prisma.SectionWhereInput;
  orderBy?: Prisma.SectionOrderByWithRelationInput;
} {
  const {
    courseId,
    semesterId,
    campusId,
    departmentId,
    teacherId,
    ids,
    search,
  } = filters;
  const where: Prisma.SectionWhereInput = {};

  const parsedCourseId = parseIntegerFilter(courseId);
  if (parsedCourseId !== null) {
    where.courseId = parsedCourseId;
  }

  const parsedSemesterId = parseIntegerFilter(semesterId);
  if (parsedSemesterId !== null) {
    where.semesterId = parsedSemesterId;
  }

  const parsedCampusId = parseIntegerFilter(campusId);
  if (parsedCampusId !== null) {
    where.campusId = parsedCampusId;
  }

  const parsedDepartmentId = parseIntegerFilter(departmentId);
  if (parsedDepartmentId !== null) {
    where.openDepartmentId = parsedDepartmentId;
  }

  const parsedTeacherId = parseIntegerFilter(teacherId);
  if (parsedTeacherId !== null) {
    where.teachers = {
      some: {
        id: parsedTeacherId,
      },
    };
  }

  const parsedIds = parseIdsFilter(ids);
  if (parsedIds.length > 0) {
    where.id = { in: parsedIds };
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

export async function listCoursesBySearch(
  search: string,
  limit: number,
  locale = "zh-cn",
) {
  const localizedPrisma = getPrisma(locale);

  return localizedPrisma.course.findMany({
    where: buildCourseListWhere({ search }),
    include: courseInclude,
    orderBy: [{ code: "asc" }, { jwId: "asc" }],
    take: limit,
  });
}

export async function findCourseDetailByJwId(jwId: number, locale = "zh-cn") {
  return getPrisma(locale).course.findUnique({
    where: { jwId },
    include: courseDetailInclude,
  });
}

export async function findSectionByJwId(jwId: number, locale = "zh-cn") {
  return getPrisma(locale).section.findUnique({
    where: { jwId },
    include: sectionInclude,
  });
}

export async function findSectionDetailByJwId(jwId: number, locale = "zh-cn") {
  return getPrisma(locale).section.findUnique({
    where: { jwId },
    include: {
      ...sectionInclude,
      roomType: true,
      schedules: true,
      scheduleGroups: true,
      teachers: {
        include: {
          department: true,
          teacherTitle: true,
        },
      },
      teacherAssignments: {
        include: {
          teacher: true,
          teacherLessonType: true,
        },
      },
      exams: {
        include: {
          examBatch: true,
          examRooms: true,
        },
      },
    },
  });
}

export async function findSectionCompactByJwId(jwId: number, locale = "zh-cn") {
  return getPrisma(locale).section.findUnique({
    where: { jwId },
    include: sectionCompactInclude,
  });
}

export async function findSectionCodeMatches(
  codes: string[],
  locale = "zh-cn",
  semesterId?: number,
): Promise<MatchedSectionCodes | null> {
  const semester = semesterId
    ? await prisma.semester.findUnique({
        where: { id: semesterId },
      })
    : await findCurrentSemester(prisma.semester, new Date());

  if (!semester) {
    return null;
  }

  const sections = await getPrisma(locale).section.findMany({
    where: {
      code: { in: codes },
      semesterId: semester.id,
    },
    include: sectionCompactInclude,
    orderBy: [{ code: "asc" }, { jwId: "asc" }],
  });

  const matchedCodes = sections.map((section) => section.code);
  const unmatchedCodes = codes.filter((code) => !matchedCodes.includes(code));
  const normalizedChunks = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/[A-Z0-9]+/g) ?? [];

  const prefixes = Array.from(
    new Set(
      unmatchedCodes
        .flatMap((code) => normalizedChunks(code))
        .map((chunk) => chunk.slice(0, Math.min(6, Math.max(3, chunk.length))))
        .filter((chunk) => chunk.length >= 3),
    ),
  );
  const limitedPrefixes = prefixes.slice(0, 40);

  const semesterCodes =
    limitedPrefixes.length > 0
      ? (
          await prisma.section.findMany({
            where: {
              semesterId: semester.id,
              OR: limitedPrefixes.map((prefix) => ({
                code: ilike(prefix),
              })),
            },
            select: { code: true },
            orderBy: [{ code: "asc" }],
            take: 1500,
          })
        ).map((section) => section.code)
      : [];

  const suggestions = Object.fromEntries(
    unmatchedCodes
      .map((code) => [code, findClosestMatches(code, semesterCodes)] as const)
      .filter(([, matches]) => matches.length > 0),
  );

  return {
    semester: {
      id: semester.id,
      nameCn: semester.nameCn,
      code: semester.code,
    },
    matchedCodes,
    unmatchedCodes,
    suggestions,
    sections,
    total: sections.length,
  };
}
