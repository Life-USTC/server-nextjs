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
  });

export const selectCurrentSemesterFromList = <
  TSemester extends SemesterWithDateRange,
>(
  semesters: TSemester[],
  referenceDate: Date,
): TSemester | null => {
  const sorted = [...semesters].sort((a, b) => {
    const startDiff = getSemesterStartTime(a) - getSemesterStartTime(b);
    if (startDiff !== 0) return startDiff;
    return getSemesterEndTime(a) - getSemesterEndTime(b);
  });

  const unfinished = sorted.filter(
    (semester) => !semester.endDate || semester.endDate >= referenceDate,
  );

  return unfinished.at(0) ?? sorted.at(-1) ?? null;
};
