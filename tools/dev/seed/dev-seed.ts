import scenarioData from "../../../tests/e2e/fixtures/scenario.json";

const s = scenarioData;

export const DEV_SEED_ANCHOR = {
  date: "2026-04-29",
  startOfDayAtTime: "2026-04-29T00:00:00+08:00",
  recommendedAtTime: "2026-04-29T08:00:00+08:00",
} as const;

export const DEV_SEED = {
  seedAnchorAtTime: DEV_SEED_ANCHOR.startOfDayAtTime,
  debugUsername: s.users.debug.username,
  debugName: s.users.debug.name,
  debugAvatarSeed: s.users.debug.avatarSeed,
  adminUsername: s.users.admin.username,
  adminName: s.users.admin.name,
  adminAvatarSeed: s.users.admin.avatarSeed,
  semesterJwId: s.semester.jwId,
  semesterNameCn: s.semester.nameCn,
  course: {
    jwId: s.courses[0].jwId,
    code: s.courses[0].code,
    nameCn: s.courses[0].nameCn,
    nameEn: s.courses[0].nameEn,
    educationLevelNameCn: s.catalog.educationLevel.nameCn,
    educationLevelNameEn: s.catalog.educationLevel.nameEn,
    categoryNameCn: s.catalog.category.nameCn,
    categoryNameEn: s.catalog.category.nameEn,
    classTypeNameCn: s.catalog.classType.nameCn,
    classTypeNameEn: s.catalog.classType.nameEn,
  },
  section: {
    jwId: s.sections[0].jwId,
    code: s.sections[0].code,
    credits: s.sections[0].credits,
    remark: s.sections[0].remark,
    examModeNameCn: s.catalog.examMode.nameCn,
    examModeNameEn: s.catalog.examMode.nameEn,
    teachLanguageNameCn: s.catalog.teachLanguage.nameCn,
    teachLanguageNameEn: s.catalog.teachLanguage.nameEn,
    roomTypeNameCn: s.catalog.roomType.nameCn,
    roomTypeNameEn: s.catalog.roomType.nameEn,
    adminClassNameCn: s.catalog.adminClass.nameCn,
    adminClassNameEn: s.catalog.adminClass.nameEn,
  },
  teacher: {
    code: s.teachers[0].code,
    nameCn: s.teachers[0].nameCn,
    nameEn: s.teachers[0].nameEn,
    email: s.teachers[0].email,
    titleNameCn: s.catalog.teacherTitle.nameCn,
    titleNameEn: s.catalog.teacherTitle.nameEn,
    departmentNameCn: s.catalog.department.nameCn,
    departmentNameEn: s.catalog.department.nameEn,
  },
  campus: { nameCn: s.catalog.campus.nameCn, nameEn: s.catalog.campus.nameEn },
  building: {
    nameCn: s.catalog.building.nameCn,
    nameEn: s.catalog.building.nameEn,
  },
  room: { nameCn: s.catalog.room.nameCn, nameEn: s.catalog.room.nameEn },
  examBatch: {
    nameCn: s.catalog.examBatch.nameCn,
    nameEn: s.catalog.examBatch.nameEn,
  },
  metadata: {
    teachLanguageNameCn: s.catalog.teachLanguage.nameCn,
    campusNameCn: s.catalog.campus.nameCn,
    buildingNameCn: s.catalog.building.nameCn,
    courseClassifyNameCn: s.catalog.classify.nameCn,
  },
  uploads: { firstFilename: s.uploads.firstFilename },
  comments: { sectionRootBody: s.comments.sectionRootBody },
  homeworks: {
    title: s.homeworks.title,
    completedTitle: s.homeworks.completedTitle,
  },
  todos: {
    dueTodayTitle: s.todos.dueTodayTitle,
    completedTitle: s.todos.completedTitle,
  },
  bus: {
    versionKey: s.bus.versionKey,
    versionTitle: s.bus.versionTitle,
    routeId: s.bus.routeId,
    recommendedRouteId: s.bus.recommendedRouteId,
    originCampusId: s.bus.originCampusId,
    destinationCampusId: s.bus.destinationCampusId,
    originCampusName: s.bus.originCampusName,
    destinationCampusName: s.bus.destinationCampusName,
    recommendedRoute: s.bus.recommendedRoute,
    recommendedDeparture: s.bus.recommendedDeparture,
  },
  suspensions: { reasonKeyword: s.suspensions.reasonKeyword },
} as const;

export const DEV_SCENARIO_MARKER = "[DEV-SCENARIO]";
export const DEV_SCENARIO_KEY_PREFIX = "dev-scenario/";

export const DEV_SCENARIO_IDS = {
  semesterJwId: s.semester.jwId,
  courseJwIds: s.courses.map((course) => course.jwId) as readonly number[],
  sectionJwIds: s.sections.map((section) => section.jwId) as readonly number[],
  scheduleGroupJwIds: s.scheduleGroups as readonly number[],
  examJwIds: s.exams.map((exam) => exam.jwId) as readonly number[],
  teacherCodes: s.teachers.map((teacher) => teacher.code) as readonly string[],
  campusJwId: s.catalog.campus.jwId,
  roomTypeJwId: s.catalog.roomType.jwId,
  buildingJwId: s.catalog.building.jwId,
  roomJwId: s.catalog.room.jwId,
  teacherTitleJwId: s.catalog.teacherTitle.jwId,
  teacherLessonTypeJwId: s.catalog.teacherLessonType.jwId,
} as const;

export function getDevScenarioRuntimeConfig() {
  return {
    debugUsername:
      process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() ||
      DEV_SEED.debugUsername,
    debugName: process.env.DEV_DEBUG_NAME?.trim() || DEV_SEED.debugName,
    adminUsername:
      process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() ||
      DEV_SEED.adminUsername,
    adminName: process.env.DEV_ADMIN_NAME?.trim() || DEV_SEED.adminName,
  };
}
