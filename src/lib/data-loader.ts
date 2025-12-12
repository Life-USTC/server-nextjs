import type { Semester } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

export async function loadSemestersFromData(data: any[]) {
  const semesters = [];
  for (const semesterJson of data) {
    // Validate dates
    const startDate = new Date(semesterJson.start);
    const endDate = new Date(semesterJson.end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error(
        `Invalid date format for semester ${semesterJson.id}: start=${semesterJson.start}, end=${semesterJson.end}`,
      );
    }

    const semester = await prisma.semester.upsert({
      where: { jwId: semesterJson.id },
      update: {
        name: semesterJson.nameZh,
        code: semesterJson.code,
        startDate,
        endDate,
      },
      create: {
        jwId: semesterJson.id,
        name: semesterJson.nameZh,
        code: semesterJson.code,
        startDate,
        endDate,
      },
    });
    semesters.push(semester);
  }

  logger.info(`Loaded ${semesters.length} semesters`);
  return semesters;
}

async function updateOrCreateModel(
  model: string,
  nameCn: string,
  nameEn?: string,
) {
  const models: Record<string, any> = {
    educationLevel: prisma.educationLevel,
    courseGradation: prisma.courseGradation,
    courseCategory: prisma.courseCategory,
    classType: prisma.classType,
    courseType: prisma.courseType,
    courseClassify: prisma.courseClassify,
    examMode: prisma.examMode,
    teachLanguage: prisma.teachLanguage,
  };

  return models[model].upsert({
    where: { nameCn },
    update: { nameEn },
    create: { nameCn, nameEn },
  });
}

async function updateOrCreateDepartment(deptJson: Record<string, unknown>) {
  const d = deptJson as {
    code?: string;
    cn?: string;
    en?: string | null;
    college?: boolean;
  };

  return prisma.department.upsert({
    where: { code: d.code as string },
    update: {
      nameCn: d.cn as string,
      nameEn: (d.en as string | null) ?? null,
      isCollege: d.college ?? false,
    },
    create: {
      code: d.code as string,
      nameCn: d.cn as string,
      nameEn: (d.en as string | null) ?? null,
      isCollege: d.college ?? false,
    },
  });
}

const UNKNOWN_DEPARTMENT_PREFIX = "未知";

async function getOrCreateDepartment(code: string) {
  return prisma.department.upsert({
    where: { code },
    update: {},
    create: {
      code,
      nameCn: `${UNKNOWN_DEPARTMENT_PREFIX}(${code})`,
      isCollege: false,
    },
  });
}

async function updateOrCreateCourse(sectionInfo: any) {
  return prisma.course.upsert({
    where: { jwId: sectionInfo.course.id },
    update: {},
    create: {
      jwId: sectionInfo.course.id,
      code: sectionInfo.course.code,
      nameCn: sectionInfo.course.cn,
      nameEn: sectionInfo.course.en,
      educationLevel: sectionInfo.education?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.education.cn },
              create: {
                nameCn: sectionInfo.education.cn,
                nameEn: sectionInfo.education.en || null,
              },
            },
          }
        : undefined,
      gradation: sectionInfo.courseGradation?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.courseGradation.cn },
              create: {
                nameCn: sectionInfo.courseGradation.cn,
                nameEn: sectionInfo.courseGradation.en || null,
              },
            },
          }
        : undefined,
      category: sectionInfo.courseCategory?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.courseCategory.cn },
              create: {
                nameCn: sectionInfo.courseCategory.cn,
                nameEn: sectionInfo.courseCategory.en || null,
              },
            },
          }
        : undefined,
      classType: sectionInfo.classType?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.classType.cn },
              create: {
                nameCn: sectionInfo.classType.cn,
                nameEn: sectionInfo.classType.en || null,
              },
            },
          }
        : undefined,
      type: sectionInfo.courseType?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.courseType.cn },
              create: {
                nameCn: sectionInfo.courseType.cn,
                nameEn: sectionInfo.courseType.en || null,
              },
            },
          }
        : undefined,
      classify: sectionInfo.courseClassify?.cn
        ? {
            connectOrCreate: {
              where: { nameCn: sectionInfo.courseClassify.cn },
              create: {
                nameCn: sectionInfo.courseClassify.cn,
                nameEn: sectionInfo.courseClassify.en || null,
              },
            },
          }
        : undefined,
    },
  });
}

async function updateOrCreateSection(
  sectionInfo: any,
  semesterId: number,
  courseId: number,
) {
  const openDepartment = sectionInfo.openDepartment
    ? await updateOrCreateDepartment(sectionInfo.openDepartment)
    : null;

  const campus = sectionInfo.campus?.cn
    ? await prisma.campus.upsert({
        where: { nameCn: sectionInfo.campus.cn },
        update: {},
        create: {
          nameCn: sectionInfo.campus.cn,
          nameEn: sectionInfo.campus.en || null,
        },
      })
    : null;

  const examMode = sectionInfo.examMode?.cn
    ? await updateOrCreateModel(
        "examMode",
        sectionInfo.examMode.cn,
        sectionInfo.examMode.en,
      )
    : null;

  const teachLanguage = sectionInfo.teachLang?.cn
    ? await updateOrCreateModel(
        "teachLanguage",
        sectionInfo.teachLang.cn,
        sectionInfo.teachLang.en,
      )
    : null;

  // Normalize dateTimePlacePersonText - it can be a string or an object with 'cn' property
  const dateTimePlacePersonText =
    typeof sectionInfo.dateTimePlacePersonText === "object" &&
    sectionInfo.dateTimePlacePersonText !== null
      ? sectionInfo.dateTimePlacePersonText.cn
      : sectionInfo.dateTimePlacePersonText;

  const section = await prisma.section.upsert({
    where: { jwId: sectionInfo.id },
    update: {},
    create: {
      jwId: sectionInfo.id,
      code: sectionInfo.code,
      credits: sectionInfo.credits,
      period: sectionInfo.period,
      periodsPerWeek: sectionInfo.periodsPerWeek,
      stdCount: sectionInfo.stdCount,
      limitCount: sectionInfo.limitCount,
      graduateAndPostgraduate: sectionInfo.graduateAndPostgraduate,
      dateTimePlaceText: sectionInfo.dateTimePlaceText,
      dateTimePlacePersonText,
      courseId,
      semesterId,
      campusId: campus?.id || null,
      openDepartmentId: openDepartment?.id || null,
      examModeId: examMode?.id || null,
      teachLanguageId: teachLanguage?.id || null,
    },
  });

  // Teachers
  const teacherList = [];
  for (const t of sectionInfo.teacherAssignmentList || []) {
    const department = t.departmentCode
      ? await getOrCreateDepartment(t.departmentCode)
      : null;

    // Find existing teacher or create new one
    let teacher = await prisma.teacher.findFirst({
      where: {
        nameCn: t.cn,
        nameEn: t.en || null,
      },
    });

    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          nameCn: t.cn,
          nameEn: t.en || null,
          departmentId: department?.id || null,
        },
      });
    } else {
      teacher = await prisma.teacher.update({
        where: { id: teacher.id },
        data: { departmentId: department?.id || null },
      });
    }
    teacherList.push(teacher);
  }

  // Connect teachers to section
  await prisma.section.update({
    where: { id: section.id },
    data: {
      teachers: {
        set: teacherList.map((t) => ({ id: t.id })),
      },
    },
  });

  // Admin classes
  const adminClassList = [];
  for (const c of sectionInfo.adminClasses || []) {
    const adminClass = await prisma.adminClass.upsert({
      where: { nameCn: c.cn },
      update: {},
      create: {
        nameCn: c.cn,
        nameEn: c.en || null,
      },
    });
    adminClassList.push(adminClass);
  }

  // Connect admin classes to section
  await prisma.section.update({
    where: { id: section.id },
    data: {
      adminClasses: {
        set: adminClassList.map((ac) => ({ id: ac.id })),
      },
    },
  });

  return section;
}

export async function loadSectionsFromData(data: any[], semester: Semester) {
  let updated = 0;

  for (const sectionInfo of data) {
    const course = await updateOrCreateCourse(sectionInfo);
    await updateOrCreateSection(sectionInfo, semester.id, course.id);
    logger.debug(`Processed section: ${sectionInfo.id}`);
    updated++;
  }

  logger.info(`Sections loaded for semester ${semester.id}: ${data.length}`);
  return updated;
}

async function updateOrCreateRoom(roomData: any) {
  const campus = await prisma.campus.upsert({
    where: { nameCn: roomData.building.campus.nameZh },
    update: {},
    create: {
      nameCn: roomData.building.campus.nameZh,
      nameEn: roomData.building.campus.nameEn || null,
      jwId: roomData.building.campus.id,
    },
  });

  const building = await prisma.building.upsert({
    where: { jwId: roomData.building.id },
    update: {},
    create: {
      jwId: roomData.building.id,
      code: roomData.building.code,
      nameCn: roomData.building.nameZh,
      nameEn: roomData.building.nameEn || null,
      campusId: campus.id,
    },
  });

  const roomType = await prisma.roomType.upsert({
    where: { jwId: roomData.roomType.id },
    update: {},
    create: {
      jwId: roomData.roomType.id,
      code: roomData.roomType.code,
      nameCn: roomData.roomType.nameZh,
      nameEn: roomData.roomType.nameEn || null,
    },
  });

  const room = await prisma.room.upsert({
    where: { jwId: roomData.id },
    update: {},
    create: {
      jwId: roomData.id,
      code: roomData.code,
      nameCn: roomData.nameZh,
      nameEn: roomData.nameEn || null,
      floor: roomData.floor,
      virtual: roomData.virtual,
      seatsForSection: roomData.seatsForLesson,
      remark: roomData.remark || null,
      seats: roomData.seats,
      buildingId: building.id,
      roomTypeId: roomType.id,
    },
  });

  return room;
}

async function updateOrCreateTeacher(
  teacherId: number | null,
  personId: number | null,
  personName: string,
) {
  let teacher = null;

  if (personId) {
    teacher = await prisma.teacher.findFirst({
      where: { personId },
    });
  }

  if (!teacher && teacherId) {
    teacher = await prisma.teacher.findFirst({
      where: { teacherId },
    });
  }

  if (!teacher) {
    teacher = await prisma.teacher.findFirst({
      where: {
        nameCn: personName,
        teacherId: null,
        personId: null,
      },
    });
  }

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        personId,
        teacherId,
        nameCn: personName,
      },
    });
  } else {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        personId: personId || teacher.personId,
        teacherId: teacherId || teacher.teacherId,
        nameCn: personName,
      },
    });
    teacher = await prisma.teacher.findUnique({
      where: { id: teacher.id },
    });
  }

  return teacher;
}

const UNKNOWN_TEACHER = "未知教师";

async function createSchedule(scheduleData: any, sectionId: number) {
  const room = scheduleData.room
    ? await updateOrCreateRoom(scheduleData.room)
    : null;

  const teacher = await updateOrCreateTeacher(
    scheduleData.teacherId || null,
    scheduleData.personId || null,
    scheduleData.personName || UNKNOWN_TEACHER,
  );

  const scheduleGroup = await prisma.scheduleGroup.findFirst({
    where: { jwId: scheduleData.scheduleGroupId },
  });

  if (!scheduleGroup) {
    logger.warning(
      `ScheduleGroup ${scheduleData.scheduleGroupId} not found for schedule`,
    );
    return;
  }

  // Validate date
  const date = new Date(scheduleData.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format for schedule: ${scheduleData.date}`);
  }

  return prisma.schedule.create({
    data: {
      sectionId,
      scheduleGroupId: scheduleGroup.id,
      roomId: room?.id || null,
      teacherId: teacher?.id || null,
      periods: scheduleData.periods,
      date,
      weekday: scheduleData.weekday,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      experiment: scheduleData.experiment || null,
      customPlace: scheduleData.customPlace || null,
      lessonType: scheduleData.lessonType || null,
      weekIndex: scheduleData.weekIndex,
      exerciseClass: scheduleData.exerciseClass || false,
      startUnit: scheduleData.startUnit,
      endUnit: scheduleData.endUnit,
    },
  });
}

export async function loadSchedulesFromData(
  schedulesData: Record<string, any>,
  semester: { id: number; jwId: number },
) {
  const sections = await prisma.section.findMany({
    where: { semesterId: semester.id },
    select: { id: true, jwId: true },
  });

  if (sections.length === 0) {
    logger.warning(`No sections found for semester ${semester.id}`);
    return 0;
  }

  let processedCount = 0;

  for (const { id, jwId } of sections) {
    const data = schedulesData[jwId.toString()];

    if (!data) {
      logger.debug(`Schedule datum not found for section ${jwId}`);
      continue;
    }

    const result = data.result;

    // Load schedule groups
    for (const groupData of result.scheduleGroupList || []) {
      if (groupData.lessonId === jwId) {
        await prisma.scheduleGroup.upsert({
          where: { jwId: groupData.id },
          update: {},
          create: {
            jwId: groupData.id,
            sectionId: id,
            no: groupData.no,
            limitCount: groupData.limitCount,
            stdCount: groupData.stdCount,
            actualPeriods: groupData.actualPeriods,
            isDefault: groupData.default,
          },
        });
      }
    }

    // Delete and recreate schedules for this section
    await prisma.schedule.deleteMany({
      where: { sectionId: id },
    });

    // Create schedules
    for (const scheduleData of result.scheduleList || []) {
      if (scheduleData.lessonId === jwId) {
        await createSchedule(scheduleData, id);
      }
    }

    logger.debug(`Loaded schedules for section ${jwId}`);
    processedCount++;
  }

  logger.info(`Schedules loaded for semester ${semester.id}`);
  return processedCount;
}
