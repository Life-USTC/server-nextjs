import type { ToolPrismaClient } from "../../shared/tool-prisma";
import {
  DEV_SCENARIO_IDS,
  DEV_SCENARIO_KEY_PREFIX,
  DEV_SCENARIO_MARKER,
  DEV_SEED,
} from "./dev-seed";

type CleanupDevScenarioOptions = {
  removeCatalogMetadata?: boolean;
  removePersonalState?: boolean;
  removeBusVersion?: boolean;
  userSuspensions?: "byMarker" | "byUser";
};

const scenarioSectionJwIds = [...DEV_SCENARIO_IDS.sectionJwIds];
const scenarioCourseJwIds = [...DEV_SCENARIO_IDS.courseJwIds];
const scenarioTeacherCodes = [...DEV_SCENARIO_IDS.teacherCodes];
const scenarioScheduleGroupJwIds = [...DEV_SCENARIO_IDS.scheduleGroupJwIds];

export async function cleanupDevScenarioData(
  prisma: ToolPrismaClient,
  userIds: string[],
  options: CleanupDevScenarioOptions = {},
) {
  const {
    removeCatalogMetadata = false,
    removePersonalState = true,
    removeBusVersion = true,
    userSuspensions = "byMarker",
  } = options;

  await prisma.session.deleteMany({
    where: {
      sessionToken: { startsWith: `${DEV_SCENARIO_KEY_PREFIX}session-` },
    },
  });
  await prisma.account.deleteMany({
    where: { provider: { startsWith: "dev-scenario-" } },
  });
  await prisma.authenticator.deleteMany({
    where: {
      credentialID: { startsWith: `${DEV_SCENARIO_KEY_PREFIX}credential-` },
    },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: DEV_SCENARIO_KEY_PREFIX } },
  });
  await prisma.verifiedEmail.deleteMany({
    where: { provider: "dev-scenario" },
  });
  await prisma.uploadPending.deleteMany({
    where: { key: { startsWith: DEV_SCENARIO_KEY_PREFIX } },
  });
  await prisma.userSuspension.deleteMany({
    where:
      userSuspensions === "byUser"
        ? { userId: { in: userIds } }
        : { reason: { contains: DEV_SCENARIO_MARKER } },
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
        { body: { contains: DEV_SCENARIO_MARKER } },
        {
          userId: { in: userIds },
          body: { contains: DEV_SCENARIO_MARKER },
        },
        { section: { jwId: { in: scenarioSectionJwIds } } },
      ],
    },
  });

  await prisma.upload.deleteMany({
    where: {
      OR: [
        { key: { startsWith: DEV_SCENARIO_KEY_PREFIX } },
        {
          userId: { in: userIds },
          key: { startsWith: DEV_SCENARIO_KEY_PREFIX },
        },
      ],
    },
  });

  const homeworks = await prisma.homework.findMany({
    where: {
      OR: [
        { title: { contains: DEV_SCENARIO_MARKER } },
        { section: { jwId: { in: scenarioSectionJwIds } } },
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

  await prisma.descriptionEdit.deleteMany({
    where: {
      OR: [
        { nextContent: { contains: DEV_SCENARIO_MARKER } },
        { description: { section: { jwId: { in: scenarioSectionJwIds } } } },
        { description: { course: { jwId: { in: scenarioCourseJwIds } } } },
        { description: { teacher: { code: { in: scenarioTeacherCodes } } } },
        {
          description: {
            homework: { section: { jwId: { in: scenarioSectionJwIds } } },
          },
        },
      ],
    },
  });
  await prisma.description.deleteMany({
    where: {
      OR: [
        { content: { contains: DEV_SCENARIO_MARKER } },
        { section: { jwId: { in: scenarioSectionJwIds } } },
        { course: { jwId: { in: scenarioCourseJwIds } } },
        { teacher: { code: { in: scenarioTeacherCodes } } },
        { homework: { section: { jwId: { in: scenarioSectionJwIds } } } },
      ],
    },
  });

  await prisma.schedule.deleteMany({
    where: { section: { jwId: { in: scenarioSectionJwIds } } },
  });
  await prisma.examRoom.deleteMany({
    where: { exam: { section: { jwId: { in: scenarioSectionJwIds } } } },
  });
  await prisma.exam.deleteMany({
    where: { section: { jwId: { in: scenarioSectionJwIds } } },
  });
  await prisma.teacherAssignment.deleteMany({
    where: { section: { jwId: { in: scenarioSectionJwIds } } },
  });
  await prisma.sectionTeacher.deleteMany({
    where: { section: { jwId: { in: scenarioSectionJwIds } } },
  });
  await prisma.homeworkAuditLog.deleteMany({
    where: { section: { jwId: { in: scenarioSectionJwIds } } },
  });
  await prisma.scheduleGroup.deleteMany({
    where: {
      OR: [
        { section: { jwId: { in: scenarioSectionJwIds } } },
        { jwId: { in: scenarioScheduleGroupJwIds } },
      ],
    },
  });
  await prisma.section.deleteMany({
    where: { jwId: { in: scenarioSectionJwIds } },
  });

  await prisma.teacher.deleteMany({
    where: { code: { in: scenarioTeacherCodes } },
  });
  await prisma.course.deleteMany({
    where: { jwId: { in: scenarioCourseJwIds } },
  });
  await prisma.examBatch.deleteMany({
    where: { nameCn: "DEV 测试考试批次" },
  });
  await prisma.adminClass.deleteMany({
    where: { nameCn: "DEV 测试班级" },
  });
  await prisma.semester.deleteMany({
    where: { jwId: DEV_SCENARIO_IDS.semesterJwId },
  });

  if (removeCatalogMetadata) {
    await prisma.room.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.roomJwId },
    });
    await prisma.building.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.buildingJwId },
    });
    await prisma.roomType.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.roomTypeJwId },
    });
    await prisma.campus.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.campusJwId },
    });
    await prisma.teacherLessonType.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.teacherLessonTypeJwId },
    });
    await prisma.teacherTitle.deleteMany({
      where: { jwId: DEV_SCENARIO_IDS.teacherTitleJwId },
    });
    await prisma.department.deleteMany({ where: { code: "DEV-DPT-001" } });
    await prisma.teachLanguage.deleteMany({ where: { nameCn: "DEV 双语" } });
    await prisma.examMode.deleteMany({ where: { nameCn: "DEV 闭卷" } });
    await prisma.educationLevel.deleteMany({ where: { nameCn: "DEV 本科" } });
    await prisma.courseCategory.deleteMany({
      where: { nameCn: "DEV 通识课程" },
    });
    await prisma.classType.deleteMany({ where: { nameCn: "DEV 理论课" } });
    await prisma.courseClassify.deleteMany({ where: { nameCn: "DEV 必修" } });
    await prisma.courseGradation.deleteMany({ where: { nameCn: "DEV 高阶" } });
    await prisma.courseType.deleteMany({ where: { nameCn: "DEV 专业课" } });
  }

  if (removePersonalState) {
    await prisma.todo.deleteMany({
      where: {
        userId: { in: userIds },
        title: { contains: DEV_SCENARIO_MARKER },
      },
    });
    await prisma.dashboardLinkClick.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.dashboardLinkPin.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.busUserPreference.deleteMany({
      where: { userId: { in: userIds } },
    });
  }

  if (removeBusVersion) {
    await prisma.busTrip.deleteMany({
      where: {
        version: {
          key: DEV_SEED.bus.versionKey,
        },
      },
    });
    await prisma.busScheduleVersion.deleteMany({
      where: { key: DEV_SEED.bus.versionKey },
    });
  }
}
