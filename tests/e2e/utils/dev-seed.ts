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
