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

type MatchedSectionCodes = {
  semester: {
    id: number;
    nameCn: string;
    code: string;
  };
  matchedCodes: string[];
  unmatchedCodes: string[];
  suggestions: Record<string, string[]>;
  sections: Array<{
    id: number;
    jwId: number;
    code: string;
    [key: string]: unknown;
  }>;
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
  const unmatchedCodePrefixes = new Map(
    unmatchedCodes.map((code) => {
      const chunks = normalizedChunks(code);
      const significantChunks = chunks.filter(
        (chunk) => chunk.length >= 4 || (chunk.length >= 3 && /\d/.test(chunk)),
      );
      const lookupChunks =
        significantChunks.length > 0 ? significantChunks : chunks;
      const prefixes = Array.from(
        new Set(
          lookupChunks
            .map((chunk) =>
              chunk.slice(0, Math.min(6, Math.max(3, chunk.length))),
            )
            .filter((chunk) => chunk.length >= 3),
        ),
      ).slice(0, 6);

      return [code, prefixes] as const;
    }),
  );
  const batchedPrefixes = Array.from(
    new Set(Array.from(unmatchedCodePrefixes.values()).flat()),
  ).slice(0, 40);
  const semesterCodes: string[] =
    batchedPrefixes.length > 0
      ? (
          await prisma.section.findMany({
            where: {
              semesterId: semester.id,
              OR: batchedPrefixes.map((prefix) => ({
                code: ilike(prefix),
              })),
            },
            select: { code: true },
            orderBy: [{ code: "asc" }],
            take: 1500,
          })
        ).map((section: { code: string }) => section.code)
      : [];
  const normalizedSemesterCodes: Array<{ code: string; normalized: string }> =
    semesterCodes.map((code: string) => ({
      code,
      normalized: code.trim().toUpperCase().replace(/\s+/g, ""),
    }));
  const prefixMatches = new Map<string, string[]>(
    batchedPrefixes.map((prefix) => [
      prefix,
      normalizedSemesterCodes
        .filter((section: { code: string; normalized: string }) =>
          section.normalized.includes(prefix),
        )
        .map((section: { code: string; normalized: string }) => section.code),
    ]),
  );
  const suggestionEntries = unmatchedCodes.map((code) => {
    const candidateCodes = Array.from(
      new Set(
        (unmatchedCodePrefixes.get(code) ?? []).flatMap(
          (prefix) => prefixMatches.get(prefix) ?? [],
        ),
      ),
    );

    return [
      code,
      findClosestMatches(code, candidateCodes, { minimumScore: 0.55 }),
    ] as const;
  });

  const suggestions = Object.fromEntries(
    suggestionEntries.filter(([, matches]) => matches.length > 0),
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
