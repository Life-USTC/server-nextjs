import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  CommentReactionType,
  CommentStatus,
  CommentVisibility,
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
const TEACHER_CODES = ["DEV-T-001", "DEV-T-002", "DEV-T-003"] as const;

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

  const sections = await prisma.section.findMany({
    where: { jwId: { in: [...SECTION_JW_IDS] } },
    select: { id: true },
  });

  for (const section of sections) {
    const subscriptions = await prisma.calendarSubscription.findMany({
      where: { sections: { some: { id: section.id } } },
      select: { id: true },
    });

    await Promise.all(
      subscriptions.map((subscription) =>
        prisma.calendarSubscription.update({
          where: { id: subscription.id },
          data: { sections: { disconnect: [{ id: section.id }] } },
        }),
      ),
    );
  }

  await prisma.schedule.deleteMany({
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

  const [campuses, departments, roomTypes, teachLanguages, examModes] =
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
    ]);

  const [educationLevels, categories, classTypes] = await Promise.all([
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
          departmentId: pick(departments, index)?.id,
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
          educationLevelId: pick(educationLevels, index)?.id,
          categoryId: pick(categories, index)?.id,
          classTypeId: pick(classTypes, index)?.id,
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
        campusId: pick(campuses, index)?.id,
        openDepartmentId: pick(departments, index)?.id,
        roomTypeId: pick(roomTypes, index)?.id,
        teachLanguageId: pick(teachLanguages, index)?.id,
        examModeId: pick(examModes, index)?.id,
        teachers: {
          connect: sectionInput.teacherIndexes.map((teacherIndex) => ({
            id: teachers[teacherIndex].id,
          })),
        },
      },
      select: { id: true, code: true, jwId: true },
    });

    sectionRecords.push(section);
  }

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

  await Promise.all([
    prisma.description.create({
      data: {
        sectionId: sectionRecords[0].id,
        content:
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
        content: "实验课建议准备护目镜并提前完成预习问答。",
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(21, 30, -1),
      },
    }),
    prisma.description.create({
      data: {
        teacherId: teachers[0].id,
        content: "老师偏好通过 PR review 反馈代码风格问题。",
        lastEditedById: debugUser.id,
        lastEditedAt: makeDateAt(22, 0, -1),
      },
    }),
  ]);

  const existingSubscription = await prisma.calendarSubscription.findFirst({
    where: { userId: debugUser.id },
    select: { id: true },
  });

  if (existingSubscription) {
    await prisma.calendarSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        sections: {
          set: sectionRecords.map((section) => ({ id: section.id })),
        },
      },
    });
  } else {
    await prisma.calendarSubscription.create({
      data: {
        userId: debugUser.id,
        sections: {
          connect: sectionRecords.map((section) => ({ id: section.id })),
        },
      },
    });
  }

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
