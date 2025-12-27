import type { PrismaClient, Semester } from "@prisma/client";

interface SemesterInterface {
  id: number;
  nameZh: string;
  code: string;
  start: string;
  end: string;
}

export type SemesterDataInterface = SemesterInterface[];

export async function loadSemesters(
  data: SemesterDataInterface,
  prisma: PrismaClient,
): Promise<Semester[]> {
  const semesters = [];

  for (const semesterJson of data) {
    const semester = await prisma.semester.upsert({
      where: { jwId: semesterJson.id },
      update: {
        nameCn: semesterJson.nameZh,
        code: semesterJson.code,
        startDate: new Date(semesterJson.start),
        endDate: new Date(semesterJson.end),
      },
      create: {
        jwId: semesterJson.id,
        nameCn: semesterJson.nameZh,
        code: semesterJson.code,
        startDate: new Date(semesterJson.start),
        endDate: new Date(semesterJson.end),
      },
    });
    semesters.push(semester);
  }

  return semesters;
}
