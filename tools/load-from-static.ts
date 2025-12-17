import "dotenv/config";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Semester } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString });
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warning: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.debug(`[DEBUG] ${msg}`),
};

async function run(cmd: string, cwd?: string) {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
  } catch (error: unknown) {
    const err = error as Error;
    throw new Error(`Command failed: ${cmd}\n${err.message}`);
  }
}

async function downloadStaticCache(targetDir: string): Promise<string> {
  /**
   * Ensure Life-USTC/static@gh-pages is present and updated, sparse-checkout 'cache'.
   * Returns path to cache directory.
   */
  const repoDir = path.join(targetDir, "static");
  const cacheDir = path.join(repoDir, "cache");

  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, ".git"))) {
    logger.info("Updating existing static cache...");
    run(
      "git remote set-url origin https://github.com/Life-USTC/static.git",
      repoDir,
    );
    run("git fetch --depth 1 origin gh-pages", repoDir);
    run("git checkout -B gh-pages", repoDir);
    run("git reset --hard origin/gh-pages", repoDir);
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set cache", repoDir);
    run("git checkout", repoDir);
  } else {
    logger.info("Cloning Life-USTC/static...");
    fs.mkdirSync(repoDir, { recursive: true });
    run(
      "git clone --no-checkout --depth 1 --branch gh-pages https://github.com/Life-USTC/static.git .",
      repoDir,
    );
    run("git sparse-checkout init --cone", repoDir);
    run("git sparse-checkout set cache", repoDir);
    run("git checkout", repoDir);
  }

  return cacheDir;
}

async function loadSemestersFromCache(cacheRoot: string) {
  const filePath = path.join(
    cacheRoot,
    "catalog",
    "api",
    "teach",
    "semester",
    "list.json",
  );
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const semesters = [];
  for (const semesterJson of data) {
    const semester = await prisma.semester.upsert({
      where: { jwId: semesterJson.id },
      update: {
        name: semesterJson.nameZh,
        code: semesterJson.code,
        startDate: new Date(semesterJson.start),
        endDate: new Date(semesterJson.end),
      },
      create: {
        jwId: semesterJson.id,
        name: semesterJson.nameZh,
        code: semesterJson.code,
        startDate: new Date(semesterJson.start),
        endDate: new Date(semesterJson.end),
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

async function getOrCreateDepartment(code: string) {
  return prisma.department.upsert({
    where: { code },
    update: {},
    create: { code, nameCn: `未知(${code})`, isCollege: false },
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
      dateTimePlacePersonText: sectionInfo.dateTimePlacePersonText,
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

async function loadSections(cacheRoot: string, semester: Semester) {
  const filePath = path.join(
    cacheRoot,
    "catalog",
    "api",
    "teach",
    "lesson",
    "list-for-teach",
    `${semester.jwId}.json`,
  );

  if (!fs.existsSync(filePath)) {
    logger.warning(
      `Sections list not found for semester ${semester.id} in ${filePath}`,
    );
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const _created = 0;
  let _updated = 0;

  for (const sectionInfo of data) {
    const course = await updateOrCreateCourse(sectionInfo);
    const _section = await updateOrCreateSection(
      sectionInfo,
      semester.id,
      course.id,
    );
    logger.debug(`Processed section: ${sectionInfo.id}`);
    _updated++;
  }

  logger.info(`Sections loaded for semester ${semester.id}: ${data.length}`);
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

async function createSchedule(scheduleData: any, sectionId: number) {
  const room = scheduleData.room
    ? await updateOrCreateRoom(scheduleData.room)
    : null;

  const teacher = await updateOrCreateTeacher(
    scheduleData.teacherId || null,
    scheduleData.personId || null,
    scheduleData.personName || "未知教师",
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

  return prisma.schedule.create({
    data: {
      sectionId,
      scheduleGroupId: scheduleGroup.id,
      roomId: room?.id || null,
      teacherId: teacher?.id || null,
      periods: scheduleData.periods,
      date: new Date(scheduleData.date),
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

async function loadSchedules(
  cacheRoot: string,
  semester: { id: number; jwId: number },
) {
  const sections = await prisma.section.findMany({
    where: { semesterId: semester.id },
    select: { id: true, jwId: true },
  });

  if (sections.length === 0) {
    logger.warning(`No sections found for semester ${semester.id}`);
    return;
  }

  const datumDir = path.join(cacheRoot, "jw", "api", "schedule-table", "datum");

  for (const { id, jwId } of sections) {
    const filePath = path.join(datumDir, `${jwId}.json`);

    if (!fs.existsSync(filePath)) {
      logger.debug(`Schedule datum not found for section ${jwId}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
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
  }

  logger.info(`Schedules loaded for semester ${semester.id}`);
}

async function main() {
  const cacheDir = process.argv[2] || "./.cache/life-ustc/static";

  try {
    logger.info("Downloading static cache...");
    const cacheRoot = await downloadStaticCache(cacheDir);
    logger.info(`Static cache at: ${cacheRoot}`);

    logger.info("Loading semesters...");
    const semesters = await loadSemestersFromCache(cacheRoot);

    if (semesters.length === 0) {
      logger.error("No semesters loaded. Aborting.");
      process.exit(1);
    }

    for (const semester of semesters) {
      logger.info(`Processing semester: ${semester.name} (${semester.code})`);
      await loadSections(cacheRoot, semester);
      await loadSchedules(cacheRoot, semester);
    }

    logger.info("Data load complete!");
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fatal error: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
