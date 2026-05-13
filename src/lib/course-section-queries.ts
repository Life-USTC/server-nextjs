import {
  buildCourseListWhere,
  buildSectionListQuery,
} from "@/lib/course-section-query-filters";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { findClosestMatches } from "@/lib/fuzzy-match";
import {
  courseDetailInclude,
  courseInclude,
  ilike,
  sectionCompactInclude,
  sectionInclude,
} from "@/lib/query-helpers";

export { buildCourseListWhere, buildSectionListQuery };

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
