export const DEV_SEED = {
  debugUsername: "dev-user",
  debugName: "Dev Debug User",
  semesterJwId: 9_900_001,
  course: {
    jwId: 9_901_001,
    code: "DEV-CS201",
    nameCn: "软件工程实践",
    nameEn: "Software Engineering Practice",
  },
  section: {
    jwId: 9_902_001,
    code: "DEV-CS201.01",
  },
  teacher: {
    code: "DEV-T-001",
    nameCn: "王测试",
  },
  metadata: {
    teachLanguageNameCn: "DEV 双语",
    campusNameCn: "DEV 校区",
    buildingNameCn: "DEV 测试楼",
    courseClassifyNameCn: "DEV 必修",
  },
  uploads: {
    firstFilename: "software-engineering-checklist.pdf",
  },
  comments: {
    sectionRootBody: "这门课节奏快，建议每周固定做一次代码评审。",
  },
  homeworks: {
    title: "迭代二系统设计评审",
    completedTitle: "迭代一需求拆解",
  },
  todos: {
    dueTodayTitle: "[DEV-SCENARIO] 今天截止待办",
    completedTitle: "[DEV-SCENARIO] 已完成待办",
  },
  bus: {
    versionKey: "dev-scenario-bus",
    versionTitle: "DEV 校车时刻表",
    routeId: 8,
    recommendedRouteId: 8,
    originCampusId: 1,
    destinationCampusId: 6,
    originCampusName: "东区",
    destinationCampusName: "高新",
    recommendedRoute: "东区 -> 西区 -> 先研院 -> 高新",
    recommendedDeparture: "07:40",
  },
  suspensions: {
    reasonKeyword: "temporary suspension for seed",
  },
} as const;

export const DEV_SCENARIO_MARKER = "[DEV-SCENARIO]";
export const DEV_SCENARIO_KEY_PREFIX = "dev-scenario/";

export const DEV_SCENARIO_IDS = {
  semesterJwId: DEV_SEED.semesterJwId,
  courseJwIds: [9_901_001, 9_901_002, 9_901_003],
  sectionJwIds: [9_902_001, 9_902_002, 9_902_003],
  scheduleGroupJwIds: [
    9_903_001, 9_903_002, 9_903_003, 9_903_004, 9_903_005, 9_903_006,
  ],
  examJwIds: [9_904_001, 9_904_002, 9_904_003],
  teacherCodes: ["DEV-T-001", "DEV-T-002", "DEV-T-003"],
  campusJwId: 9_910_001,
  roomTypeJwId: 9_910_011,
  buildingJwId: 9_910_021,
  roomJwId: 9_910_031,
  teacherTitleJwId: 9_910_041,
  teacherLessonTypeJwId: 9_910_051,
} as const;

export function getDevScenarioRuntimeConfig() {
  const debugUsername =
    process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() ||
    DEV_SEED.debugUsername;
  return {
    debugUsername,
    debugName: process.env.DEV_DEBUG_NAME?.trim() || DEV_SEED.debugName,
    adminUsername:
      process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() || "dev-admin",
  };
}
