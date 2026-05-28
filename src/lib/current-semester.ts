import type { Prisma, PrismaClient, Semester } from "@/generated/prisma/client";

type SemesterWithDateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

type SemesterFindFirstDelegate = Pick<PrismaClient["semester"], "findFirst">;

const startTime = (s: SemesterWithDateRange) =>
  s.startDate?.getTime() ?? Number.NEGATIVE_INFINITY;

const endTime = (s: SemesterWithDateRange) =>
  s.endDate?.getTime() ?? Number.POSITIVE_INFINITY;

/**
 * Sort comparator: prefer later start, then earlier end (most specific current semester).
 */
const byMostSpecific = <TSemester extends SemesterWithDateRange>(
  a: TSemester,
  b: TSemester,
) => startTime(b) - startTime(a) || endTime(a) - endTime(b);

export const buildCurrentSemesterWhere = (
  referenceDate: Date,
): Prisma.SemesterWhereInput => ({
  startDate: { lte: referenceDate },
  endDate: { gte: referenceDate },
});

export const findCurrentSemester = (
  semesterDelegate: SemesterFindFirstDelegate,
  referenceDate = new Date(),
): Promise<Semester | null> =>
  semesterDelegate.findFirst({
    where: buildCurrentSemesterWhere(referenceDate),
    orderBy: [
      { startDate: "desc" },
      { endDate: "asc" },
      { jwId: "desc" },
      { id: "desc" },
    ],
  });

export const selectCurrentSemesterFromList = <
  TSemester extends SemesterWithDateRange,
>(
  semesters: TSemester[],
  referenceDate: Date,
): TSemester | null => {
  // 1. Prefer a semester currently in session (started and not yet ended)
  const current = semesters
    .filter(
      (s) =>
        (!s.startDate || s.startDate <= referenceDate) &&
        (!s.endDate || s.endDate >= referenceDate),
    )
    .sort(byMostSpecific);
  if (current[0]) return current[0];

  // 2. Fall back to the nearest upcoming semester
  const future = semesters
    .filter((s) => s.startDate && s.startDate > referenceDate)
    .sort((a, b) => startTime(a) - startTime(b) || endTime(a) - endTime(b));
  if (future[0]) return future[0];

  // 3. Fall back to the most specific semester overall (likely the most recent past)
  return [...semesters].sort(byMostSpecific).at(0) ?? null;
};
