import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  CommentReactionType,
  CommentStatus,
  CommentVisibility,
  HomeworkAuditAction,
  type Prisma,
  PrismaClient,
} from "../src/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const LEGACY_SCENARIO_MARKER = "[DEV-SCENARIO]";
const DEV_KEY_PREFIX = "dev-scenario/";

const debugUsername =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";
const debugName = process.env.DEV_DEBUG_NAME?.trim() || "Dev Debug User";

const adminUsername =
  process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() || "dev-admin";

const SEMESTER_JW_ID = 9_900_001;
const COURSE_JW_IDS = [9_901_001, 9_901_002, 9_901_003] as const;
const SECTION_JW_IDS = [9_902_001, 9_902_002, 9_902_003] as const;
const SCHEDULE_GROUP_JW_IDS = [
  9_903_001, 9_903_002, 9_903_003, 9_903_004, 9_903_005, 9_903_006,
] as const;
const EXAM_JW_IDS = [9_904_001, 9_904_002, 9_904_003] as const;
const TEACHER_CODES = ["DEV-T-001", "DEV-T-002", "DEV-T-003"] as const;
const DEV_CAMPUS_JW_ID = 9_910_001;
const DEV_ROOM_TYPE_JW_ID = 9_910_011;
const DEV_BUILDING_JW_ID = 9_910_021;
const DEV_ROOM_JW_ID = 9_910_031;
const DEV_TEACHER_TITLE_JW_ID = 9_910_041;
const DEV_TEACHER_LESSON_TYPE_JW_ID = 9_910_051;

function makeDateAt(hour: number, minute: number, offsetDays = 0) {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offsetDays,
    hour,
    minute,
    0,
    0,
  );
}

function toWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function pick<T>(items: T[], index: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[index % items.length];
}

async function cleanupScenarioData(userIds: string[]) {
  await prisma.session.deleteMany({
    where: { sessionToken: { startsWith: `${DEV_KEY_PREFIX}session-` } },
  });
  await prisma.account.deleteMany({
    where: { provider: { startsWith: "dev-scenario-" } },
  });
  await prisma.authenticator.deleteMany({
    where: { credentialID: { startsWith: `${DEV_KEY_PREFIX}credential-` } },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: DEV_KEY_PREFIX } },
  });
  await prisma.verifiedEmail.deleteMany({
    where: { provider: "dev-scenario" },
  });
  await prisma.uploadPending.deleteMany({
    where: { key: { startsWith: DEV_KEY_PREFIX } },
  });
  await prisma.userSuspension.deleteMany({
    where: { reason: { contains: LEGACY_SCENARIO_MARKER } },
  });

  await Promise.all(
    userIds.map((userId) =>
      prisma.user.update({
        where: { id: userId },
        data: { subscribedSections: { set: [] } },
      }),
    ),
  );

  await prisma.comment.deleteMany({
    where: {
      OR: [
        { body: { contains: LEGACY_SCENARIO_MARKER } },
        {
          userId: { in: userIds },
          body: { contains: LEGACY_SCENARIO_MARKER },
        },
        { section: { jwId: { in: [...SECTION_JW_IDS] } } },
      ],
    },
  });

  await prisma.upload.deleteMany({
    where: {
      OR: [
        { key: { startsWith: DEV_KEY_PREFIX } },
        { userId: { in: userIds }, key: { startsWith: DEV_KEY_PREFIX } },
      ],
    },
  });

  const homeworks = await prisma.homework.findMany({
    where: {
      OR: [
        { title: { contains: LEGACY_SCENARIO_MARKER } },
        { section: { jwId: { in: [...SECTION_JW_IDS] } } },
      ],
    },
    select: { id: true },
  });

  if (homeworks.length > 0) {
    const homeworkIds = homeworks.map((item) => item.id);
    await prisma.homeworkCompletion.deleteMany({
      where: { homeworkId: { in: homeworkIds } },
    });
    await prisma.homework.deleteMany({ where: { id: { in: homeworkIds } } });
  }

  await prisma.description.deleteMany({
    where: { content: { contains: LEGACY_SCENARIO_MARKER } },
  });
  await prisma.descriptionEdit.deleteMany({
    where: { nextContent: { contains: LEGACY_SCENARIO_MARKER } },
  });

  await prisma.schedule.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.examRoom.deleteMany({
    where: { exam: { section: { jwId: { in: [...SECTION_JW_IDS] } } } },
  });
  await prisma.exam.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.teacherAssignment.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.sectionTeacher.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.homeworkAuditLog.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.scheduleGroup.deleteMany({
    where: { section: { jwId: { in: [...SECTION_JW_IDS] } } },
  });
  await prisma.section.deleteMany({
    where: { jwId: { in: [...SECTION_JW_IDS] } },
  });

  await prisma.teacher.deleteMany({
    where: { code: { in: [...TEACHER_CODES] } },
  });
  await prisma.course.deleteMany({
    where: { jwId: { in: [...COURSE_JW_IDS] } },
  });
  await prisma.examBatch.deleteMany({
    where: { nameCn: "DEV 测试考试批次" },
  });
  await prisma.adminClass.deleteMany({
    where: { nameCn: "DEV 测试班级" },
  });
  await prisma.semester.deleteMany({ where: { jwId: SEMESTER_JW_ID } });
}

async function main() {
  const [debugUser, adminUser] = await Promise.all([
    prisma.user.upsert({
      where: { username: debugUsername },
      update: {
        name: debugName,
        image:
          "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-user",
      },
      create: {
        username: debugUsername,
        name: debugName,
        image:
          "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-user",
      },
      select: { id: true, username: true },
    }),
    prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        name: "Dev Moderator",
        isAdmin: true,
        image:
          "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
      },
      create: {
        username: adminUsername,
        name: "Dev Moderator",
        isAdmin: true,
        image:
          "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
      },
      select: { id: true, username: true },
    }),
  ]);

  await cleanupScenarioData([debugUser.id, adminUser.id]);

  const [
    seedCampus,
    seedDepartment,
    seedRoomType,
    seedTeachLanguage,
    seedExamMode,
    seedEducationLevel,
    seedCategory,
    seedClassType,
    seedClassify,
    seedGradation,
    seedCourseType,
    seedTeacherTitle,
    seedTeacherLessonType,
    seedAdminClass,
    seedExamBatch,
  ] = await Promise.all([
    prisma.campus.upsert({
      where: { jwId: DEV_CAMPUS_JW_ID },
      update: { code: "DEV-CAMPUS", nameCn: "DEV 校区", nameEn: "Dev Campus" },
      create: {
        jwId: DEV_CAMPUS_JW_ID,
        code: "DEV-CAMPUS",
        nameCn: "DEV 校区",
        nameEn: "Dev Campus",
      },
      select: { id: true },
    }),
    prisma.department.upsert({
      where: { code: "DEV-DPT-001" },
      update: {
        nameCn: "DEV 测试学院",
        nameEn: "Dev Testing School",
        isCollege: true,
      },
      create: {
        code: "DEV-DPT-001",
        nameCn: "DEV 测试学院",
        nameEn: "Dev Testing School",
        isCollege: true,
      },
      select: { id: true },
    }),
    prisma.roomType.upsert({
      where: { jwId: DEV_ROOM_TYPE_JW_ID },
      update: {
        code: "DEV-ROOM-TYPE",
        nameCn: "DEV 教室类型",
        nameEn: "Dev Room Type",
      },
      create: {
        jwId: DEV_ROOM_TYPE_JW_ID,
        code: "DEV-ROOM-TYPE",
        nameCn: "DEV 教室类型",
        nameEn: "Dev Room Type",
      },
      select: { id: true },
    }),
    prisma.teachLanguage.upsert({
      where: { nameCn: "DEV 双语" },
      update: { nameEn: "Dev Bilingual" },
      create: { nameCn: "DEV 双语", nameEn: "Dev Bilingual" },
      select: { id: true },
    }),
    prisma.examMode.upsert({
      where: { nameCn: "DEV 闭卷" },
      update: { nameEn: "Dev Closed-book" },
      create: { nameCn: "DEV 闭卷", nameEn: "Dev Closed-book" },
      select: { id: true },
    }),
    prisma.educationLevel.upsert({
      where: { nameCn: "DEV 本科" },
      update: { nameEn: "Dev Undergraduate" },
      create: { nameCn: "DEV 本科", nameEn: "Dev Undergraduate" },
      select: { id: true },
    }),
    prisma.courseCategory.upsert({
      where: { nameCn: "DEV 通识课程" },
      update: { nameEn: "Dev General Course" },
      create: { nameCn: "DEV 通识课程", nameEn: "Dev General Course" },
      select: { id: true },
    }),
    prisma.classType.upsert({
      where: { nameCn: "DEV 理论课" },
      update: { nameEn: "Dev Lecture" },
      create: { nameCn: "DEV 理论课", nameEn: "Dev Lecture" },
      select: { id: true },
    }),
    prisma.courseClassify.upsert({
      where: { nameCn: "DEV 必修" },
      update: { nameEn: "Dev Required" },
      create: { nameCn: "DEV 必修", nameEn: "Dev Required" },
      select: { id: true },
    }),
    prisma.courseGradation.upsert({
      where: { nameCn: "DEV 高阶" },
      update: { nameEn: "Dev Advanced" },
      create: { nameCn: "DEV 高阶", nameEn: "Dev Advanced" },
      select: { id: true },
    }),
    prisma.courseType.upsert({
      where: { nameCn: "DEV 专业课" },
      update: { nameEn: "Dev Major Course" },
      create: { nameCn: "DEV 专业课", nameEn: "Dev Major Course" },
      select: { id: true },
    }),
    prisma.teacherTitle.upsert({
      where: { jwId: DEV_TEACHER_TITLE_JW_ID },
      update: {
        code: "DEV-TITLE",
        nameCn: "DEV 教师职称",
        nameEn: "Dev Teacher Title",
        enabled: true,
      },
      create: {
        jwId: DEV_TEACHER_TITLE_JW_ID,
        code: "DEV-TITLE",
        nameCn: "DEV 教师职称",
        nameEn: "Dev Teacher Title",
        enabled: true,
      },
      select: { id: true },
    }),
    prisma.teacherLessonType.upsert({
      where: { jwId: DEV_TEACHER_LESSON_TYPE_JW_ID },
      update: {
        code: "DEV-LESSON",
        nameCn: "DEV 主讲",
        nameEn: "Dev Lecturer",
        role: "lecturer",
        enabled: true,
      },
      create: {
        jwId: DEV_TEACHER_LESSON_TYPE_JW_ID,
        code: "DEV-LESSON",
        nameCn: "DEV 主讲",
        nameEn: "Dev Lecturer",
        role: "lecturer",
        enabled: true,
      },
      select: { id: true },
    }),
    prisma.adminClass.upsert({
      where: { nameCn: "DEV 测试班级" },
      update: {
        jwId: 9_910_061,
        code: "DEV-CLASS-01",
        nameEn: "Dev Test Class",
      },
      create: {
        jwId: 9_910_061,
        code: "DEV-CLASS-01",
        nameCn: "DEV 测试班级",
        nameEn: "Dev Test Class",
        grade: "2026",
        stdCount: 32,
        planCount: 35,
        enabled: true,
      },
      select: { id: true },
    }),
    prisma.examBatch.upsert({
      where: { nameCn: "DEV 测试考试批次" },
      update: { nameEn: "Dev Exam Batch" },
      create: { nameCn: "DEV 测试考试批次", nameEn: "Dev Exam Batch" },
      select: { id: true },
    }),
  ]);

  const seedBuilding = await prisma.building.upsert({
    where: { jwId: DEV_BUILDING_JW_ID },
    update: {
      nameCn: "DEV 测试楼",
      nameEn: "Dev Building",
      code: "DEV-BUILDING",
      campusId: seedCampus.id,
    },
    create: {
      jwId: DEV_BUILDING_JW_ID,
      nameCn: "DEV 测试楼",
      nameEn: "Dev Building",
      code: "DEV-BUILDING",
      campusId: seedCampus.id,
    },
    select: { id: true },
  });

  await prisma.room.upsert({
    where: { jwId: DEV_ROOM_JW_ID },
    update: {
      nameCn: "DEV 测试教室 101",
      nameEn: "Dev Room 101",
      code: "101",
      virtual: false,
      seatsForSection: 60,
      seats: 60,
      buildingId: seedBuilding.id,
      roomTypeId: seedRoomType.id,
    },
    create: {
      jwId: DEV_ROOM_JW_ID,
      nameCn: "DEV 测试教室 101",
      nameEn: "Dev Room 101",
      code: "101",
      floor: 1,
      virtual: false,
      seatsForSection: 60,
      seats: 60,
      buildingId: seedBuilding.id,
      roomTypeId: seedRoomType.id,
    },
  });

  const [campuses, departments, roomTypes, teachLanguages, examModes, rooms] =
    await Promise.all([
      prisma.campus.findMany({
        select: { id: true },
        take: 8,
        orderBy: { id: "asc" },
      }),
      prisma.department.findMany({
        select: { id: true },
        take: 12,
        orderBy: { id: "asc" },
      }),
      prisma.roomType.findMany({
        select: { id: true },
        take: 8,
        orderBy: { id: "asc" },
      }),
      prisma.teachLanguage.findMany({
        select: { id: true },
        take: 4,
        orderBy: { id: "asc" },
      }),
      prisma.examMode.findMany({
        select: { id: true },
        take: 4,
        orderBy: { id: "asc" },
      }),
      prisma.room.findMany({
        select: { id: true, nameCn: true },
        take: 8,
        orderBy: { id: "asc" },
      }),
    ]);

  const [
    educationLevels,
    categories,
    classTypes,
    classifies,
    gradations,
    courseTypes,
    teacherTitles,
  ] = await Promise.all([
    prisma.educationLevel.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.courseCategory.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.classType.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.courseClassify.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.courseGradation.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.courseType.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
    prisma.teacherTitle.findMany({
      select: { id: true },
      take: 6,
      orderBy: { id: "asc" },
    }),
  ]);

  const semesterStart = makeDateAt(0, 0, -21);
  const semesterEnd = makeDateAt(0, 0, 130);

  const semester = await prisma.semester.create({
    data: {
      jwId: SEMESTER_JW_ID,
      nameCn: "2026 春测试学期",
      code: "DEV-2026-SPRING",
      startDate: semesterStart,
      endDate: semesterEnd,
    },
    select: { id: true },
  });

  const teachers = await Promise.all(
    [
      {
        code: TEACHER_CODES[0],
        nameCn: "王测试",
        nameEn: "Wang Test",
        email: "wang.test@ustc.dev",
        mobile: "13800001111",
      },
      {
        code: TEACHER_CODES[1],
        nameCn: "李样例",
        nameEn: "Li Example",
        email: "li.example@ustc.dev",
        mobile: "13800002222",
      },
      {
        code: TEACHER_CODES[2],
        nameCn: "陈实验",
        nameEn: "Chen Lab",
        email: "chen.lab@ustc.dev",
        mobile: "13800003333",
      },
    ].map((teacherSeed, index) =>
      prisma.teacher.create({
        data: {
          ...teacherSeed,
          departmentId: pick(departments, index)?.id ?? seedDepartment.id,
          teacherTitleId: pick(teacherTitles, index)?.id ?? seedTeacherTitle.id,
          address: "中国科学技术大学",
        },
        select: { id: true, nameCn: true },
      }),
    ),
  );

  const courses = await Promise.all(
    [
      {
        jwId: COURSE_JW_IDS[0],
        code: "DEV-CS201",
        nameCn: "软件工程实践",
        nameEn: "Software Engineering Practice",
      },
      {
        jwId: COURSE_JW_IDS[1],
        code: "DEV-MA212",
        nameCn: "高等线性代数",
        nameEn: "Advanced Linear Algebra",
      },
      {
        jwId: COURSE_JW_IDS[2],
        code: "DEV-PH230",
        nameCn: "近代实验方法",
        nameEn: "Modern Experimental Methods",
      },
    ].map((courseSeed, index) =>
      prisma.course.create({
        data: {
          ...courseSeed,
          educationLevelId:
            pick(educationLevels, index)?.id ?? seedEducationLevel.id,
          categoryId: pick(categories, index)?.id ?? seedCategory.id,
          classTypeId: pick(classTypes, index)?.id ?? seedClassType.id,
          classifyId: pick(classifies, index)?.id ?? seedClassify.id,
          gradationId: pick(gradations, index)?.id ?? seedGradation.id,
          typeId: pick(courseTypes, index)?.id ?? seedCourseType.id,
        },
        select: { id: true, code: true, nameCn: true },
      }),
    ),
  );

  const sectionInputs: Array<{
    jwId: number;
    code: string;
    courseId: number;
    credits: number;
    stdCount: number;
    limitCount: number;
    teacherIndexes: number[];
    remark: string;
    groupIds: [number, number];
  }> = [
    {
      jwId: SECTION_JW_IDS[0],
      code: "DEV-CS201.01",
      courseId: courses[0].id,
      credits: 3,
      stdCount: 46,
      limitCount: 60,
      teacherIndexes: [0, 1],
      remark: "项目型课堂，强调周内迭代与代码评审。",
      groupIds: [SCHEDULE_GROUP_JW_IDS[0], SCHEDULE_GROUP_JW_IDS[1]],
    },
    {
      jwId: SECTION_JW_IDS[1],
      code: "DEV-MA212.02",
      courseId: courses[1].id,
      credits: 4,
      stdCount: 72,
      limitCount: 90,
      teacherIndexes: [1],
      remark: "理论课 + 习题课双节奏安排。",
      groupIds: [SCHEDULE_GROUP_JW_IDS[2], SCHEDULE_GROUP_JW_IDS[3]],
    },
    {
      jwId: SECTION_JW_IDS[2],
      code: "DEV-PH230.03",
      courseId: courses[2].id,
      credits: 2,
      stdCount: 28,
      limitCount: 36,
      teacherIndexes: [2],
      remark: "小班实验与阶段汇报并行。",
      groupIds: [SCHEDULE_GROUP_JW_IDS[4], SCHEDULE_GROUP_JW_IDS[5]],
    },
  ];

  const sectionRecords: Array<{ id: number; code: string; jwId: number }> = [];

  for (let index = 0; index < sectionInputs.length; index += 1) {
    const sectionInput = sectionInputs[index];
    const section = await prisma.section.create({
      data: {
        jwId: sectionInput.jwId,
        code: sectionInput.code,
        courseId: sectionInput.courseId,
        semesterId: semester.id,
        credits: sectionInput.credits,
        stdCount: sectionInput.stdCount,
        limitCount: sectionInput.limitCount,
        period: sectionInput.credits * 16,
        periodsPerWeek: 2,
        timesPerWeek: 2,
        remark: sectionInput.remark,
        scheduleRemark: "包含早课、午后与晚课时段。",
        campusId: pick(campuses, index)?.id ?? seedCampus.id,
        openDepartmentId: pick(departments, index)?.id ?? seedDepartment.id,
        roomTypeId: pick(roomTypes, index)?.id ?? seedRoomType.id,
        teachLanguageId:
          pick(teachLanguages, index)?.id ?? seedTeachLanguage.id,
        examModeId: pick(examModes, index)?.id ?? seedExamMode.id,
        teachers: {
          connect: sectionInput.teacherIndexes.map((teacherIndex) => ({
            id: teachers[teacherIndex].id,
          })),
        },
        adminClasses: {
          connect: [{ id: seedAdminClass.id }],
        },
      },
      select: { id: true, code: true, jwId: true },
    });

    sectionRecords.push(section);
  }

  await prisma.sectionTeacher.createMany({
    data: sectionInputs.flatMap((sectionInput, sectionIndex) =>
      sectionInput.teacherIndexes.map((teacherIndex) => ({
        sectionId: sectionRecords[sectionIndex].id,
        teacherId: teachers[teacherIndex].id,
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.teacherAssignment.createMany({
    data: sectionInputs.flatMap((sectionInput, sectionIndex) =>
      sectionInput.teacherIndexes.map((teacherIndex) => ({
        teacherId: teachers[teacherIndex].id,
        sectionId: sectionRecords[sectionIndex].id,
        role: "lecturer",
        period: 16,
        weekIndices: [1, 2, 3, 4, 5, 6, 7, 8],
        weekIndicesMsg: "1-8 周",
        teacherLessonTypeId: seedTeacherLessonType.id,
      })),
    ),
    skipDuplicates: true,
  });

  const schedulesToCreate: Array<Prisma.ScheduleCreateInput> = [];

  for (let index = 0; index < sectionInputs.length; index += 1) {
    const sectionInput = sectionInputs[index];
    const section = sectionRecords[index];

    const [defaultGroup, altGroup] = await Promise.all([
      prisma.scheduleGroup.create({
        data: {
          jwId: sectionInput.groupIds[0],
          sectionId: section.id,
          no: 1,
          limitCount: sectionInput.limitCount,
          stdCount: sectionInput.stdCount,
          actualPeriods: 2,
          isDefault: true,
        },
        select: { id: true },
      }),
      prisma.scheduleGroup.create({
        data: {
          jwId: sectionInput.groupIds[1],
          sectionId: section.id,
          no: 2,
          limitCount: sectionInput.limitCount,
          stdCount: sectionInput.stdCount,
          actualPeriods: 2,
          isDefault: false,
        },
        select: { id: true },
      }),
    ]);

    const morningDate = makeDateAt(8, 30, index);
    const afternoonDate = makeDateAt(14, 0, index + 1);

    schedulesToCreate.push(
      {
        section: { connect: { id: section.id } },
        scheduleGroup: { connect: { id: defaultGroup.id } },
        room: rooms[index % rooms.length]
          ? { connect: { id: rooms[index % rooms.length].id } }
          : undefined,
        date: morningDate,
        weekday: toWeekday(morningDate),
        startTime: 830,
        endTime: 1015,
        periods: 2,
        weekIndex: 2,
        startUnit: 1,
        endUnit: 2,
        teachers: {
          connect: sectionInput.teacherIndexes.map((teacherIndex) => ({
            id: teachers[teacherIndex].id,
          })),
        },
      },
      {
        section: { connect: { id: section.id } },
        scheduleGroup: { connect: { id: altGroup.id } },
        room: rooms[(index + 1) % rooms.length]
          ? { connect: { id: rooms[(index + 1) % rooms.length].id } }
          : undefined,
        date: afternoonDate,
        weekday: toWeekday(afternoonDate),
        startTime: 1400,
        endTime: 1545,
        periods: 2,
        weekIndex: 2,
        startUnit: 7,
        endUnit: 8,
        teachers: {
          connect: sectionInput.teacherIndexes.map((teacherIndex) => ({
            id: teachers[teacherIndex].id,
          })),
        },
      },
    );
  }

  for (const scheduleData of schedulesToCreate) {
    await prisma.schedule.create({ data: scheduleData });
  }

  const exams = await Promise.all(
    sectionRecords.map((section, index) =>
      prisma.exam.create({
        data: {
          jwId: EXAM_JW_IDS[index],
          sectionId: section.id,
          examBatchId: seedExamBatch.id,
          examType: 1,
          startTime: 900,
          endTime: 1100,
          examDate: makeDateAt(0, 0, 10 + index),
          examTakeCount: 1,
          examMode: "闭卷",
        },
        select: { id: true },
      }),
    ),
  );

  await prisma.examRoom.createMany({
    data: exams.map((exam, index) => ({
      examId: exam.id,
      room: rooms[index % rooms.length]?.nameCn ?? `DEV 考场 ${index + 1}`,
      count: 30 + index * 5,
    })),
  });

  const publishedAt = makeDateAt(9, 0, -1);

  const homeworkSeeds = [
    {
      sectionId: sectionRecords[0].id,
      title: "迭代一需求拆解",
      submissionDueAt: makeDateAt(23, 0, 1),
      isMajor: false,
      requiresTeam: false,
    },
    {
      sectionId: sectionRecords[0].id,
      title: "迭代二系统设计评审",
      submissionDueAt: makeDateAt(23, 0, 4),
      isMajor: true,
      requiresTeam: true,
    },
    {
      sectionId: sectionRecords[1].id,
      title: "线性变换证明题",
      submissionDueAt: makeDateAt(22, 0, 2),
      isMajor: false,
      requiresTeam: false,
    },
    {
      sectionId: sectionRecords[1].id,
      title: "特征值综合练习",
      submissionDueAt: makeDateAt(22, 0, 6),
      isMajor: false,
      requiresTeam: false,
    },
    {
      sectionId: sectionRecords[2].id,
      title: "实验报告与误差分析",
      submissionDueAt: makeDateAt(21, 0, 3),
      isMajor: true,
      requiresTeam: true,
    },
  ];

  const homeworks = await Promise.all(
    homeworkSeeds.map((seed) =>
      prisma.homework.create({
        data: {
          ...seed,
          createdById: debugUser.id,
          updatedById: debugUser.id,
          publishedAt,
          submissionStartAt: publishedAt,
        },
        select: { id: true, title: true },
      }),
    ),
  );

  await prisma.homeworkCompletion.createMany({
    data: [
      {
        userId: debugUser.id,
        homeworkId: homeworks[0].id,
        completedAt: makeDateAt(20, 0, 0),
      },
      {
        userId: debugUser.id,
        homeworkId: homeworks[2].id,
        completedAt: makeDateAt(20, 30, 1),
      },
    ],
  });

  await prisma.homeworkAuditLog.createMany({
    data: homeworks.map((homework, index) => ({
      action: HomeworkAuditAction.created,
      titleSnapshot: homework.title,
      sectionId: sectionRecords[index % sectionRecords.length].id,
      homeworkId: homework.id,
      actorId: debugUser.id,
      createdAt: makeDateAt(9, 30, -1),
    })),
  });

  const uploads = await Promise.all(
    [
      {
        filename: "software-engineering-checklist.pdf",
        contentType: "application/pdf",
        size: 1_258_220,
      },
      {
        filename: "linear-algebra-notes.md",
        contentType: "text/markdown",
        size: 18_432,
      },
      {
        filename: "physics-lab-template.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 94_220,
      },
    ].map((seed, index) =>
      prisma.upload.create({
        data: {
          userId: debugUser.id,
          key: `${DEV_KEY_PREFIX}${Date.now()}-${index}-${seed.filename}`,
          filename: seed.filename,
          contentType: seed.contentType,
          size: seed.size,
        },
        select: { id: true, filename: true },
      }),
    ),
  );

  const sectionRootComment = await prisma.comment.create({
    data: {
      userId: debugUser.id,
      sectionId: sectionRecords[0].id,
      body: "这门课节奏快，建议每周固定做一次代码评审。",
      visibility: CommentVisibility.public,
    },
    select: { id: true },
  });

  await Promise.all([
    prisma.comment.create({
      data: {
        userId: debugUser.id,
        sectionId: sectionRecords[0].id,
        parentId: sectionRootComment.id,
        rootId: sectionRootComment.id,
        body: "回复：推荐先写测试用例再实现。",
        visibility: CommentVisibility.logged_in_only,
      },
    }),
    prisma.comment.create({
      data: {
        userId: debugUser.id,
        courseId: courses[1].id,
        body: "课程难度中上，适合作为线代进阶。",
        visibility: CommentVisibility.anonymous,
        isAnonymous: true,
        authorName: "匿名同学",
      },
      select: { id: true },
    }),
    prisma.comment.create({
      data: {
        userId: debugUser.id,
        teacherId: teachers[2].id,
        body: "实验指导细致，答疑响应很及时。",
        visibility: CommentVisibility.public,
      },
    }),
    prisma.comment.create({
      data: {
        userId: debugUser.id,
        homeworkId: homeworks[4].id,
        body: "注意提交报告时附上原始数据截图。",
        visibility: CommentVisibility.public,
        status: CommentStatus.softbanned,
        moderatedById: adminUser.id,
        moderatedAt: makeDateAt(10, 0, 0),
        moderationNote: "仅用于验证私密评论状态展示。",
      },
    }),
  ]);

  const commentWithAttachment = await prisma.comment.create({
    data: {
      userId: debugUser.id,
      sectionId: sectionRecords[2].id,
      body: "附上实验模板，方便大家统一格式。",
      visibility: CommentVisibility.public,
    },
    select: { id: true },
  });

  await prisma.commentAttachment.create({
    data: {
      commentId: commentWithAttachment.id,
      uploadId: uploads[2].id,
    },
  });

  await prisma.commentReaction.createMany({
    data: [
      {
        commentId: sectionRootComment.id,
        userId: adminUser.id,
        type: CommentReactionType.upvote,
      },
      {
        commentId: commentWithAttachment.id,
        userId: adminUser.id,
        type: CommentReactionType.heart,
      },
    ],
  });

  const descriptions = await Promise.all([
    prisma.description.create({
      data: {
        sectionId: sectionRecords[0].id,
        content:
          `${LEGACY_SCENARIO_MARKER}\n` +
          "# 课程建议\n" +
          "- 每周提前阅读需求文档\n" +
          "- 课堂展示前先做一次组内彩排\n",
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(21, 0, -1),
      },
    }),
    prisma.description.create({
      data: {
        courseId: courses[2].id,
        content: `${LEGACY_SCENARIO_MARKER} 实验课建议准备护目镜并提前完成预习问答。`,
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(21, 30, -1),
      },
    }),
    prisma.description.create({
      data: {
        teacherId: teachers[0].id,
        content: `${LEGACY_SCENARIO_MARKER} 老师偏好通过 PR review 反馈代码风格问题。`,
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(22, 0, -1),
      },
    }),
    prisma.description.create({
      data: {
        homeworkId: homeworks[0].id,
        content: `${LEGACY_SCENARIO_MARKER} 作业要求：提交仓库链接和测试截图。`,
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(22, 30, -1),
      },
    }),
  ]);

  await prisma.descriptionEdit.createMany({
    data: descriptions.map((description, index) => ({
      descriptionId: description.id,
      editorId: debugUser.id,
      previousContent: "",
      nextContent: `${LEGACY_SCENARIO_MARKER} description edit #${index + 1}`,
      createdAt: makeDateAt(22, 40 + index, -1),
    })),
  });

  await prisma.user.update({
    where: { id: debugUser.id },
    data: {
      subscribedSections: {
        set: sectionRecords.map((section) => ({ id: section.id })),
      },
    },
  });

  await prisma.uploadPending.upsert({
    where: { key: `${DEV_KEY_PREFIX}pending-lab-template.xlsx` },
    update: {
      filename: "pending-lab-template.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 52_000,
      expiresAt: makeDateAt(23, 59, 1),
      userId: debugUser.id,
    },
    create: {
      key: `${DEV_KEY_PREFIX}pending-lab-template.xlsx`,
      filename: "pending-lab-template.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 52_000,
      expiresAt: makeDateAt(23, 59, 1),
      userId: debugUser.id,
    },
  });

  await prisma.verifiedEmail.deleteMany({
    where: { provider: "dev-scenario", email: "dev-user@ustc.dev" },
  });
  await prisma.verifiedEmail.create({
    data: {
      provider: "dev-scenario",
      email: "dev-user@ustc.dev",
      userId: debugUser.id,
    },
  });

  await prisma.account.deleteMany({
    where: {
      provider: "dev-scenario-oidc",
      providerAccountId: "dev-user-account",
    },
  });
  await prisma.account.create({
    data: {
      userId: debugUser.id,
      type: "oidc",
      provider: "dev-scenario-oidc",
      providerAccountId: "dev-user-account",
      access_token: "dev-access-token",
      token_type: "Bearer",
      scope: "openid profile email",
      expires_at: Math.floor(makeDateAt(23, 59, 1).getTime() / 1000),
    },
  });

  await prisma.session.deleteMany({
    where: { sessionToken: `${DEV_KEY_PREFIX}session-debug-user` },
  });
  await prisma.session.create({
    data: {
      sessionToken: `${DEV_KEY_PREFIX}session-debug-user`,
      userId: debugUser.id,
      expires: makeDateAt(23, 59, 7),
    },
  });

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: `${DEV_KEY_PREFIX}verify-debug-user`,
      token: "dev-verify-token",
    },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `${DEV_KEY_PREFIX}verify-debug-user`,
      token: "dev-verify-token",
      expires: makeDateAt(23, 59, 2),
    },
  });

  await prisma.authenticator.deleteMany({
    where: { credentialID: `${DEV_KEY_PREFIX}credential-debug-user` },
  });
  await prisma.authenticator.create({
    data: {
      credentialID: `${DEV_KEY_PREFIX}credential-debug-user`,
      userId: debugUser.id,
      providerAccountId: "dev-user-account",
      credentialPublicKey: "dev-public-key",
      counter: 1,
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
      transports: "usb",
    },
  });

  await prisma.userSuspension.create({
    data: {
      userId: debugUser.id,
      createdById: adminUser.id,
      reason: `${LEGACY_SCENARIO_MARKER} temporary suspension for seed`,
      note: "Used by admin API and UI tests.",
      expiresAt: makeDateAt(23, 59, 3),
      liftedAt: makeDateAt(9, 0, 0),
      liftedById: adminUser.id,
    },
  });

  console.log("开发调试数据初始化完成");
  console.log(`用户: ${debugUser.username}`);
  console.log(`管理员: ${adminUser.username}`);
  console.log(`课程数: ${courses.length}, 班级数: ${sectionRecords.length}`);
  console.log(`作业数: ${homeworks.length}, 上传数: ${uploads.length}`);
}

main()
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("开发调试数据初始化失败", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
