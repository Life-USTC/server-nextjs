import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const LEGACY_SCENARIO_MARKER = "[DEV-SCENARIO]";
const DEV_KEY_PREFIX = "dev-scenario/";
const debugUsername =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";
const adminUsername =
  process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() || "dev-admin";

const SEMESTER_JW_ID = 9_900_001;
const COURSE_JW_IDS = [9_901_001, 9_901_002, 9_901_003] as const;
const SECTION_JW_IDS = [9_902_001, 9_902_002, 9_902_003] as const;
const TEACHER_CODES = ["DEV-T-001", "DEV-T-002", "DEV-T-003"] as const;
const SCHEDULE_GROUP_JW_IDS = [
  9_903_001, 9_903_002, 9_903_003, 9_903_004, 9_903_005, 9_903_006,
] as const;
const DEV_CAMPUS_JW_ID = 9_910_001;
const DEV_ROOM_TYPE_JW_ID = 9_910_011;
const DEV_BUILDING_JW_ID = 9_910_021;
const DEV_ROOM_JW_ID = 9_910_031;
const DEV_TEACHER_TITLE_JW_ID = 9_910_041;
const DEV_TEACHER_LESSON_TYPE_JW_ID = 9_910_051;

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
    where: {
      OR: [
        { section: { jwId: { in: [...SECTION_JW_IDS] } } },
        { jwId: { in: [...SCHEDULE_GROUP_JW_IDS] } },
      ],
    },
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

  await prisma.room.deleteMany({ where: { jwId: DEV_ROOM_JW_ID } });
  await prisma.building.deleteMany({ where: { jwId: DEV_BUILDING_JW_ID } });
  await prisma.roomType.deleteMany({ where: { jwId: DEV_ROOM_TYPE_JW_ID } });
  await prisma.campus.deleteMany({ where: { jwId: DEV_CAMPUS_JW_ID } });
  await prisma.teacherLessonType.deleteMany({
    where: { jwId: DEV_TEACHER_LESSON_TYPE_JW_ID },
  });
  await prisma.teacherTitle.deleteMany({
    where: { jwId: DEV_TEACHER_TITLE_JW_ID },
  });
  await prisma.department.deleteMany({ where: { code: "DEV-DPT-001" } });
  await prisma.teachLanguage.deleteMany({ where: { nameCn: "DEV 双语" } });
  await prisma.examMode.deleteMany({ where: { nameCn: "DEV 闭卷" } });
  await prisma.educationLevel.deleteMany({ where: { nameCn: "DEV 本科" } });
  await prisma.courseCategory.deleteMany({ where: { nameCn: "DEV 通识课程" } });
  await prisma.classType.deleteMany({ where: { nameCn: "DEV 理论课" } });
  await prisma.courseClassify.deleteMany({ where: { nameCn: "DEV 必修" } });
  await prisma.courseGradation.deleteMany({ where: { nameCn: "DEV 高阶" } });
  await prisma.courseType.deleteMany({ where: { nameCn: "DEV 专业课" } });
}

async function main() {
  const users = await prisma.user.findMany({
    where: { username: { in: [debugUsername, adminUsername] } },
    select: { id: true, username: true },
  });

  await cleanupScenarioData(users.map((user) => user.id));

  console.log("开发调试场景数据清理完成");
  console.log(`已处理用户数: ${users.length}`);
}

main()
  .catch((error: unknown) => {
    const err = error as Error;
    console.error("开发调试场景数据清理失败", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
