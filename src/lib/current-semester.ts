import type { Prisma, PrismaClient, Semester } from "@/generated/prisma/client";

type SemesterWithDateRange = {
  startDate: Date | null;
  endDate: Date | null;
};

type SemesterFindFirstDelegate = Pick<PrismaClient["semester"], "findFirst">;

const getSemesterStartTime = (semester: SemesterWithDateRange) =>
  semester.startDate?.getTime() ?? Number.NEGATIVE_INFINITY;

const getSemesterEndTime = (semester: SemesterWithDateRange) =>
  semester.endDate?.getTime() ?? Number.POSITIVE_INFINITY;

const hasStarted = (semester: SemesterWithDateRange, referenceDate: Date) =>
  !semester.startDate || semester.startDate <= referenceDate;

const hasNotEnded = (semester: SemesterWithDateRange, referenceDate: Date) =>
  !semester.endDate || semester.endDate >= referenceDate;

const compareMostSpecificCurrentSemester = <
  TSemester extends SemesterWithDateRange,
>(
  a: TSemester,
  b: TSemester,
) => {
  const startDiff = getSemesterStartTime(b) - getSemesterStartTime(a);
  if (startDiff !== 0) return startDiff;
  return getSemesterEndTime(a) - getSemesterEndTime(b);
};

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
  const current = semesters
    .filter(
      (semester) =>
        hasStarted(semester, referenceDate) &&
        hasNotEnded(semester, referenceDate),
    )
    .sort(compareMostSpecificCurrentSemester);
  if (current[0]) return current[0];

  const future = semesters
    .filter((semester) => !hasStarted(semester, referenceDate))
    .sort((a, b) => {
      const startDiff = getSemesterStartTime(a) - getSemesterStartTime(b);
      if (startDiff !== 0) return startDiff;
      return getSemesterEndTime(a) - getSemesterEndTime(b);
    });
  if (future[0]) return future[0];

  return [...semesters].sort(compareMostSpecificCurrentSemester).at(0) ?? null;
};
