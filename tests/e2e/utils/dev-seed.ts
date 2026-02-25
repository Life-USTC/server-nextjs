export const DEV_SEED = {
  debugUsername: "dev-user",
  debugName: "Dev Debug User",
  semesterJwId: 9_900_001,
  course: {
    jwId: 9_901_001,
    code: "DEV-CS201",
    nameCn: "软件工程实践",
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
  suspensions: {
    reasonKeyword: "temporary suspension for seed",
  },
} as const;
