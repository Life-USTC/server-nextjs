import { prisma } from "@/lib/db/prisma";

export async function getSeedCourseFilterFixture(jwId: number) {
  const course = await prisma.course.findUniqueOrThrow({
    where: { jwId },
    select: {
      educationLevelId: true,
      categoryId: true,
      classTypeId: true,
      educationLevel: { select: { nameCn: true } },
      category: { select: { nameCn: true } },
      classType: { select: { nameCn: true } },
    },
  });

  return {
    educationLevelId: course.educationLevelId,
    educationLevelName: course.educationLevel?.nameCn ?? null,
    categoryId: course.categoryId,
    categoryName: course.category?.nameCn ?? null,
    classTypeId: course.classTypeId,
    classTypeName: course.classType?.nameCn ?? null,
  };
}

export async function getSeedTeacherDepartmentFixture(code: string) {
  const teacher = await prisma.teacher.findUniqueOrThrow({
    where: { code },
    select: {
      departmentId: true,
      department: { select: { nameCn: true } },
    },
  });

  return {
    departmentId: teacher.departmentId,
    departmentName: teacher.department?.nameCn ?? null,
  };
}

export async function getSeedSectionSemesterFixture(jwId: number) {
  const section = await prisma.section.findUniqueOrThrow({
    where: { jwId },
    select: {
      semesterId: true,
      semester: { select: { nameCn: true } },
    },
  });

  return {
    semesterId: section.semesterId,
    semesterName: section.semester?.nameCn ?? null,
  };
}
