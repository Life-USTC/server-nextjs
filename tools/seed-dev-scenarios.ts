import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  CommentVisibility,
  PrismaClient,
} from "../src/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SCENARIO_MARKER = "[DEV-SCENARIO]";
const debugUsername =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";
const debugName = process.env.DEV_DEBUG_NAME?.trim() || "Dev Debug User";

const SEMESTER_JW_ID = 990_000_1;
const COURSE_JW_ID = 990_100_1;
const SECTION_JW_ID = 990_200_1;
const GROUP_A_JW_ID = 990_300_1;
const GROUP_B_JW_ID = 990_300_2;
const TEACHER_CODE = "DEV-T-001";

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

async function cleanupScenarioData(userId: string) {
  await prisma.comment.deleteMany({
    where: {
      OR: [
        { body: { contains: SCENARIO_MARKER } },
        { userId, body: { contains: SCENARIO_MARKER } },
      ],
    },
  });

  await prisma.upload.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "dev-scenario/" } },
        { userId, key: { startsWith: "dev-scenario/" } },
      ],
    },
  });

  const homeworks = await prisma.homework.findMany({
    where: {
      OR: [
        { title: { contains: SCENARIO_MARKER } },
        { section: { jwId: SECTION_JW_ID } },
      ],
    },
    select: { id: true },
  });

  if (homeworks.length > 0) {
    const homeworkIds = homeworks.map((item) => item.id);
    await prisma.homeworkCompletion.deleteMany({
      where: { homeworkId: { in: homeworkIds } },
    });
    await prisma.homework.deleteMany({
      where: { id: { in: homeworkIds } },
    });
  }

  const section = await prisma.section.findUnique({
    where: { jwId: SECTION_JW_ID },
    select: { id: true },
  });

  if (section) {
    const subscriptions = await prisma.calendarSubscription.findMany({
      where: { sections: { some: { id: section.id } } },
      select: { id: true },
    });
    await Promise.all(
      subscriptions.map((subscription) =>
        prisma.calendarSubscription.update({
          where: { id: subscription.id },
          data: {
            sections: {
              disconnect: [{ id: section.id }],
            },
          },
        }),
      ),
    );

    await prisma.schedule.deleteMany({ where: { sectionId: section.id } });
    await prisma.scheduleGroup.deleteMany({ where: { sectionId: section.id } });
    await prisma.section.delete({ where: { id: section.id } });
  }

  await prisma.teacher.deleteMany({
    where: { code: TEACHER_CODE },
  });
  await prisma.course.deleteMany({
    where: { jwId: COURSE_JW_ID },
  });
  await prisma.semester.deleteMany({
    where: { jwId: SEMESTER_JW_ID },
  });
}

async function main() {
  const user = await prisma.user.upsert({
    where: { username: debugUsername },
    update: {
      name: debugName,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
    },
    create: {
      username: debugUsername,
      name: debugName,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
    },
  });

  await cleanupScenarioData(user.id);

  const semesterStart = makeDateAt(0, 0, -14);
  const semesterEnd = makeDateAt(0, 0, 120);
  const todayClassDate = makeDateAt(10, 0, 0);
  const tomorrowClassDate = makeDateAt(14, 0, 1);

  const semester = await prisma.semester.create({
    data: {
      jwId: SEMESTER_JW_ID,
      nameCn: `${SCENARIO_MARKER} 开发测试学期`,
      code: "DEV-TERM",
      startDate: semesterStart,
      endDate: semesterEnd,
    },
    select: { id: true },
  });

  const course = await prisma.course.create({
    data: {
      jwId: COURSE_JW_ID,
      code: "DEV101",
      nameCn: `${SCENARIO_MARKER} 可预测测试课程`,
      nameEn: "Predictable Testing Course",
    },
    select: { id: true },
  });

  const teacher = await prisma.teacher.create({
    data: {
      code: TEACHER_CODE,
      nameCn: `${SCENARIO_MARKER} 调试老师`,
      nameEn: "Debug Teacher",
    },
    select: { id: true },
  });

  const section = await prisma.section.create({
    data: {
      jwId: SECTION_JW_ID,
      code: "DEV101.01",
      courseId: course.id,
      semesterId: semester.id,
      credits: 3,
      limitCount: 60,
      stdCount: 32,
      remark: `${SCENARIO_MARKER} 这个班级用于开发环境 E2E 覆盖。`,
      teachers: {
        connect: [{ id: teacher.id }],
      },
    },
    select: { id: true },
  });

  const groupA = await prisma.scheduleGroup.create({
    data: {
      jwId: GROUP_A_JW_ID,
      sectionId: section.id,
      no: 1,
      limitCount: 60,
      stdCount: 32,
      actualPeriods: 2,
      isDefault: true,
    },
    select: { id: true },
  });

  const groupB = await prisma.scheduleGroup.create({
    data: {
      jwId: GROUP_B_JW_ID,
      sectionId: section.id,
      no: 2,
      limitCount: 60,
      stdCount: 32,
      actualPeriods: 2,
      isDefault: false,
    },
    select: { id: true },
  });

  await prisma.schedule.createMany({
    data: [
      {
        sectionId: section.id,
        scheduleGroupId: groupA.id,
        periods: 2,
        date: todayClassDate,
        weekday: toWeekday(todayClassDate),
        startTime: 1000,
        endTime: 1145,
        weekIndex: 1,
        startUnit: 3,
        endUnit: 4,
      },
      {
        sectionId: section.id,
        scheduleGroupId: groupB.id,
        periods: 2,
        date: tomorrowClassDate,
        weekday: toWeekday(tomorrowClassDate),
        startTime: 1400,
        endTime: 1545,
        weekIndex: 1,
        startUnit: 7,
        endUnit: 8,
      },
    ],
  });

  const publishedAt = makeDateAt(8, 30, 0);
  const dueAt = makeDateAt(23, 0, 0);
  const dueAtLater = makeDateAt(23, 0, 3);

  const homework = await prisma.homework.create({
    data: {
      sectionId: section.id,
      title: `${SCENARIO_MARKER} 今日截止作业`,
      createdById: user.id,
      updatedById: user.id,
      publishedAt,
      submissionStartAt: publishedAt,
      submissionDueAt: dueAt,
      isMajor: false,
      requiresTeam: false,
    },
    select: { id: true },
  });

  await prisma.homework.create({
    data: {
      sectionId: section.id,
      title: `${SCENARIO_MARKER} 三天后截止作业`,
      createdById: user.id,
      updatedById: user.id,
      publishedAt,
      submissionStartAt: publishedAt,
      submissionDueAt: dueAtLater,
      isMajor: true,
      requiresTeam: true,
    },
  });

  await prisma.homeworkCompletion.upsert({
    where: {
      userId_homeworkId: {
        userId: user.id,
        homeworkId: homework.id,
      },
    },
    update: {
      completedAt: makeDateAt(9, 0, 0),
    },
    create: {
      userId: user.id,
      homeworkId: homework.id,
      completedAt: makeDateAt(9, 0, 0),
    },
  });

  const rootComment = await prisma.comment.create({
    data: {
      userId: user.id,
      sectionId: section.id,
      body: `${SCENARIO_MARKER} 这个班级用于验证登录后评论、作业与日历流程。`,
      visibility: CommentVisibility.public,
    },
    select: { id: true },
  });

  await prisma.comment.create({
    data: {
      userId: user.id,
      sectionId: section.id,
      parentId: rootComment.id,
      rootId: rootComment.id,
      body: `${SCENARIO_MARKER} 回复：这个线程可用于测试评论跳转。`,
      visibility: CommentVisibility.logged_in_only,
    },
  });

  await prisma.comment.create({
    data: {
      userId: user.id,
      courseId: course.id,
      body: `${SCENARIO_MARKER} 课程维度评论，用于课程页回归测试。`,
      visibility: CommentVisibility.public,
    },
  });

  await prisma.comment.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      body: `${SCENARIO_MARKER} 教师维度评论，用于教师详情测试。`,
      visibility: CommentVisibility.public,
    },
  });

  await prisma.comment.create({
    data: {
      userId: user.id,
      homeworkId: homework.id,
      body: `${SCENARIO_MARKER} 作业评论，用于作业讨论页测试。`,
      visibility: CommentVisibility.public,
    },
  });

  await prisma.upload.create({
    data: {
      userId: user.id,
      key: `dev-scenario/${Date.now()}-note.txt`,
      filename: "dev-scenario-note.txt",
      contentType: "text/plain",
      size: 256,
    },
  });

  const existingSubscription = await prisma.calendarSubscription.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingSubscription) {
    await prisma.calendarSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        sections: {
          set: [{ id: section.id }],
        },
      },
    });
  } else {
    await prisma.calendarSubscription.create({
      data: {
        userId: user.id,
        sections: {
          connect: [{ id: section.id }],
        },
      },
    });
  }

  console.log("[DEV-SCENARIO] 已完成确定性调试数据初始化");
  console.log(`[DEV-SCENARIO] 用户名: ${debugUsername}`);
  console.log(`[DEV-SCENARIO] 班级: ${SECTION_JW_ID}（今天与明天均有课）`);
}

main()
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("[DEV-SCENARIO] 初始化失败", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
