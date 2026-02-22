import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  adminCommentsQuerySchema,
  adminCommentsResponseSchema,
  adminCreateSuspensionRequestSchema,
  adminModerateCommentRequestSchema,
  adminModeratedCommentSchema,
  adminSuspensionResponseSchema,
  adminSuspensionsResponseSchema,
  adminUpdateUserRequestSchema,
  adminUserResponseSchema,
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  calendarSubscriptionCreateRequestSchema,
  calendarSubscriptionSchema,
  calendarSubscriptionSummarySchema,
  calendarSubscriptionUpdateRequestSchema,
  commentCreateRequestSchema,
  commentNodeSchema,
  commentReactionRequestSchema,
  commentsListResponseSchema,
  commentsQuerySchema,
  commentThreadResponseSchema,
  commentUpdateRequestSchema,
  coursesQuerySchema,
  descriptionsQuerySchema,
  descriptionsResponseSchema,
  descriptionUpsertRequestSchema,
  homeworkCompletionRequestSchema,
  homeworkCompletionResponseSchema,
  homeworkCreateRequestSchema,
  homeworksListResponseSchema,
  homeworksQuerySchema,
  homeworkUpdateRequestSchema,
  localeUpdateRequestSchema,
  matchSectionCodesRequestSchema,
  metadataResponseSchema,
  openApiErrorSchema,
  paginatedCourseResponseSchema,
  paginatedScheduleResponseSchema,
  paginatedSectionResponseSchema,
  paginatedSemesterResponseSchema,
  paginatedTeacherResponseSchema,
  scheduleGroupSchedulesSchema,
  schedulesQuerySchema,
  scheduleWithGroupSchema,
  sectionCodeSchema,
  sectionCompactSchema,
  sectionDetailSchema,
  sectionsQuerySchema,
  teachersQuerySchema,
  uploadCompleteRequestSchema,
  uploadCompleteResponseSchema,
  uploadCreateRequestSchema,
  uploadCreateResponseSchema,
  uploadRenameRequestSchema,
  uploadRenameResponseSchema,
  uploadsListResponseSchema,
} from "@/lib/api-schemas";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const commentNodeOpenApiSchema = registry.register(
  "CommentNode",
  commentNodeSchema,
);

const commentsListOpenApiSchema = registry.register(
  "CommentsListResponse",
  commentsListResponseSchema.extend({
    comments: z.array(commentNodeOpenApiSchema),
  }),
);

const commentThreadOpenApiSchema = registry.register(
  "CommentThreadResponse",
  commentThreadResponseSchema.extend({
    thread: z.array(commentNodeOpenApiSchema),
  }),
);

const semesterSummarySchema = z.object({
  id: z.number().int(),
  nameCn: z.string().nullable(),
  code: z.string().nullable(),
});

const matchCodesResponseSchema = z.object({
  semester: semesterSummarySchema,
  matchedCodes: z.array(sectionCodeSchema),
  unmatchedCodes: z.array(sectionCodeSchema),
  sections: z.array(sectionCompactSchema),
  total: z.number().int().nonnegative(),
});

const currentSemesterResponseSchema = z.object({
  id: z.number().int(),
  nameCn: z.string().nullable(),
  nameEn: z.string().nullable(),
  code: z.string().nullable(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
});

const openApiDocumentSchema = z
  .object({
    openapi: z.string(),
    info: z.object({
      title: z.string(),
      version: z.string(),
      description: z.string().optional(),
    }),
    paths: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const homeworkCreateResponseSchema = z.object({
  id: z.string(),
});

const descriptionUpsertResponseSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
});

const paginationQuerySchema = z.object({
  page: z
    .string()
    .regex(/^-?\d+$/)
    .optional(),
  limit: z
    .string()
    .regex(/^-?\d+$/)
    .optional(),
});

registry.registerPath({
  method: "post",
  path: "/api/sections/match-codes",
  summary: "Match section codes in one semester",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: matchSectionCodesRequestSchema,
          example: {
            codes: ["COMP3001.01", "MATH1001.02"],
            semesterId: "12",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Matched section result",
      content: {
        "application/json": {
          schema: matchCodesResponseSchema,
          example: {
            semester: { id: 12, nameCn: "2026 春", code: "2026S" },
            matchedCodes: ["COMP3001.01"],
            unmatchedCodes: ["MATH1001.02"],
            sections: [
              {
                id: 1024,
                jwId: 210001,
                code: "COMP3001.01",
                bizTypeId: null,
                credits: 3,
                period: 48,
                periodsPerWeek: 4,
                timesPerWeek: 2,
                stdCount: 60,
                limitCount: 80,
                graduateAndPostgraduate: null,
                dateTimePlaceText: "周一 3-4 节 西区教一-101",
                dateTimePlacePersonText: { room: "西区教一-101" },
                actualPeriods: 48,
                theoryPeriods: 32,
                practicePeriods: 16,
                experimentPeriods: null,
                machinePeriods: null,
                designPeriods: null,
                testPeriods: null,
                scheduleState: null,
                suggestScheduleWeeks: [1, 2, 3, 4],
                suggestScheduleWeekInfo: null,
                scheduleJsonParams: { weeks: 16 },
                selectedStdCount: 30,
                remark: null,
                scheduleRemark: null,
                courseId: 1,
                semesterId: 12,
                campusId: 2,
                examModeId: 1,
                openDepartmentId: 10,
                teachLanguageId: 1,
                roomTypeId: 1,
                course: {
                  id: 1,
                  jwId: 1001,
                  code: "COMP3001",
                  nameCn: "操作系统",
                  nameEn: "Operating Systems",
                  categoryId: 2,
                  classTypeId: 3,
                  classifyId: 4,
                  educationLevelId: 1,
                  gradationId: 2,
                  typeId: 3,
                  category: { id: 2, nameCn: "通识", nameEn: "General" },
                  classType: { id: 3, nameCn: "必修", nameEn: "Required" },
                  classify: { id: 4, nameCn: "专业", nameEn: "Major" },
                  educationLevel: {
                    id: 1,
                    nameCn: "本科",
                    nameEn: "Undergraduate",
                  },
                  gradation: { id: 2, nameCn: "一级", nameEn: "Level 1" },
                  type: { id: 3, nameCn: "理论", nameEn: "Lecture" },
                },
                semester: {
                  id: 12,
                  jwId: 202601,
                  nameCn: "2026 春",
                  code: "2026S",
                  startDate: "2026-02-15T00:00:00.000Z",
                  endDate: "2026-07-10T00:00:00.000Z",
                },
                campus: {
                  id: 2,
                  jwId: 20,
                  nameCn: "西区",
                  nameEn: "West",
                  code: "W",
                },
                openDepartment: {
                  id: 10,
                  code: "CS",
                  nameCn: "计算机学院",
                  nameEn: "School of CS",
                  isCollege: true,
                },
                teachers: [
                  {
                    id: 7,
                    personId: 701,
                    teacherId: 7001,
                    code: "T7001",
                    nameCn: "张老师",
                    nameEn: "Zhang",
                    age: null,
                    email: null,
                    telephone: null,
                    mobile: null,
                    address: null,
                    postcode: null,
                    qq: null,
                    wechat: null,
                    departmentId: 10,
                    teacherTitleId: 3,
                  },
                ],
              },
            ],
            total: 1,
          },
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
          example: { error: "codes must be a non-empty array" },
        },
      },
    },
    404: {
      description: "No semester found",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
          example: { error: "No current semester found" },
        },
      },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/semesters/current",
  summary: "Get current semester",
  responses: {
    200: {
      description: "Current semester",
      content: {
        "application/json": {
          schema: currentSemesterResponseSchema,
          example: {
            id: 12,
            nameCn: "2026 春",
            nameEn: "Spring 2026",
            code: "2026S",
            startDate: "2026-02-15T00:00:00.000Z",
            endDate: "2026-07-10T00:00:00.000Z",
          },
        },
      },
    },
    404: {
      description: "No current semester",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
          example: { error: "No current semester found" },
        },
      },
    },
  },
  tags: ["Semesters"],
});

registry.registerPath({
  method: "post",
  path: "/api/homeworks",
  summary: "Create homework for one section",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: homeworkCreateRequestSchema,
          example: {
            sectionId: "1024",
            title: "Homework 1",
            description: "Solve chapter 1 exercises",
            publishedAt: "2026-03-01T08:00:00.000Z",
            submissionDueAt: "2026-03-10T15:59:59.000Z",
            isMajor: false,
            requiresTeam: false,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Homework created",
      content: {
        "application/json": {
          schema: homeworkCreateResponseSchema,
          example: { id: "hw_2y4q7" },
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
          example: { error: "Invalid homework request" },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Section not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "get",
  path: "/api/courses",
  summary: "List courses",
  request: {
    query: coursesQuerySchema,
  },
  responses: {
    200: {
      description: "Courses list",
      content: {
        "application/json": {
          schema: paginatedCourseResponseSchema,
          example: {
            data: [
              {
                id: 1,
                jwId: 1001,
                code: "COMP101",
                nameCn: "计算机导论",
                nameEn: "Introduction to CS",
                categoryId: 2,
                classTypeId: 3,
                classifyId: 4,
                educationLevelId: 1,
                gradationId: 2,
                typeId: 3,
                category: { id: 2, nameCn: "通识", nameEn: "General" },
                classType: { id: 3, nameCn: "必修", nameEn: "Required" },
                classify: { id: 4, nameCn: "专业", nameEn: "Major" },
                educationLevel: {
                  id: 1,
                  nameCn: "本科",
                  nameEn: "Undergraduate",
                },
                gradation: { id: 2, nameCn: "一级", nameEn: "Level 1" },
                type: { id: 3, nameCn: "理论", nameEn: "Lecture" },
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Courses"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections",
  summary: "List sections",
  request: {
    query: sectionsQuerySchema,
  },
  responses: {
    200: {
      description: "Sections list",
      content: {
        "application/json": {
          schema: paginatedSectionResponseSchema,
          example: {
            data: [
              {
                id: 1024,
                jwId: 210001,
                code: "COMP101.01",
                bizTypeId: null,
                credits: 3,
                period: 48,
                periodsPerWeek: 4,
                timesPerWeek: 2,
                stdCount: 60,
                limitCount: 80,
                graduateAndPostgraduate: null,
                dateTimePlaceText: "周一 3-4 节 西区教一-101",
                dateTimePlacePersonText: { room: "西区教一-101" },
                actualPeriods: 48,
                theoryPeriods: 32,
                practicePeriods: 16,
                experimentPeriods: null,
                machinePeriods: null,
                designPeriods: null,
                testPeriods: null,
                scheduleState: null,
                suggestScheduleWeeks: [1, 2, 3, 4],
                suggestScheduleWeekInfo: null,
                scheduleJsonParams: { weeks: 16 },
                selectedStdCount: 30,
                remark: null,
                scheduleRemark: null,
                courseId: 1,
                semesterId: 12,
                campusId: 2,
                examModeId: 1,
                openDepartmentId: 10,
                teachLanguageId: 1,
                roomTypeId: 1,
                course: {
                  id: 1,
                  jwId: 1001,
                  code: "COMP101",
                  nameCn: "计算机导论",
                  nameEn: "Introduction to CS",
                  categoryId: 2,
                  classTypeId: 3,
                  classifyId: 4,
                  educationLevelId: 1,
                  gradationId: 2,
                  typeId: 3,
                  category: { id: 2, nameCn: "通识", nameEn: "General" },
                  classType: { id: 3, nameCn: "必修", nameEn: "Required" },
                  classify: { id: 4, nameCn: "专业", nameEn: "Major" },
                  educationLevel: {
                    id: 1,
                    nameCn: "本科",
                    nameEn: "Undergraduate",
                  },
                  gradation: { id: 2, nameCn: "一级", nameEn: "Level 1" },
                  type: { id: 3, nameCn: "理论", nameEn: "Lecture" },
                },
                semester: {
                  id: 12,
                  jwId: 202601,
                  nameCn: "2026 春",
                  code: "2026S",
                  startDate: "2026-02-15T00:00:00.000Z",
                  endDate: "2026-07-10T00:00:00.000Z",
                },
                campus: {
                  id: 2,
                  jwId: 20,
                  nameCn: "西区",
                  nameEn: "West",
                  code: "W",
                },
                openDepartment: {
                  id: 10,
                  code: "CS",
                  nameCn: "计算机学院",
                  nameEn: "School of CS",
                  isCollege: true,
                },
                examMode: { id: 1, nameCn: "闭卷", nameEn: "Closed" },
                teachLanguage: { id: 1, nameCn: "中文", nameEn: "Chinese" },
                teachers: [
                  {
                    id: 7,
                    personId: 701,
                    teacherId: 7001,
                    code: "T7001",
                    nameCn: "张老师",
                    nameEn: "Zhang",
                    age: null,
                    email: null,
                    telephone: null,
                    mobile: null,
                    address: null,
                    postcode: null,
                    qq: null,
                    wechat: null,
                    departmentId: 10,
                    teacherTitleId: 3,
                  },
                ],
                adminClasses: [
                  {
                    id: 5,
                    jwId: 5001,
                    code: "CS2001",
                    grade: "2024",
                    nameCn: "计科 2024 级 1 班",
                    nameEn: null,
                    stdCount: 30,
                    planCount: 32,
                    enabled: true,
                    abbrZh: "计科 1",
                    abbrEn: "CS1",
                  },
                ],
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/teachers",
  summary: "List teachers",
  request: {
    query: teachersQuerySchema,
  },
  responses: {
    200: {
      description: "Teachers list",
      content: {
        "application/json": {
          schema: paginatedTeacherResponseSchema,
          example: {
            data: [
              {
                id: 7,
                personId: 701,
                teacherId: 7001,
                code: "T7001",
                nameCn: "张老师",
                nameEn: "Zhang",
                age: null,
                email: "zhang@example.com",
                telephone: null,
                mobile: null,
                address: null,
                postcode: null,
                qq: null,
                wechat: null,
                departmentId: 10,
                teacherTitleId: 3,
                department: {
                  id: 10,
                  code: "CS",
                  nameCn: "计算机学院",
                  nameEn: "School of CS",
                  isCollege: true,
                },
                teacherTitle: {
                  id: 3,
                  jwId: 3001,
                  nameCn: "副教授",
                  nameEn: "Associate Professor",
                  code: "AP",
                  enabled: true,
                },
                _count: { sections: 6 },
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Teachers"],
});

registry.registerPath({
  method: "get",
  path: "/api/schedules",
  summary: "List schedules",
  request: {
    query: schedulesQuerySchema,
  },
  responses: {
    200: {
      description: "Schedules list",
      content: {
        "application/json": {
          schema: paginatedScheduleResponseSchema,
          example: {
            data: [
              {
                id: 9001,
                periods: 2,
                date: "2026-03-02T00:00:00.000Z",
                weekday: 1,
                startTime: 3,
                endTime: 4,
                experiment: null,
                customPlace: null,
                lessonType: null,
                weekIndex: 2,
                exerciseClass: false,
                startUnit: 3,
                endUnit: 4,
                roomId: 101,
                sectionId: 1024,
                scheduleGroupId: 301,
                room: {
                  id: 101,
                  jwId: 10001,
                  nameCn: "教一-101",
                  nameEn: null,
                  code: "101",
                  floor: 1,
                  virtual: false,
                  seatsForSection: 80,
                  remark: null,
                  seats: 120,
                  buildingId: 11,
                  roomTypeId: 1,
                  building: {
                    id: 11,
                    jwId: 1101,
                    nameCn: "西区教一",
                    nameEn: null,
                    code: "W-1",
                    campusId: 2,
                    campus: {
                      id: 2,
                      jwId: 20,
                      nameCn: "西区",
                      nameEn: "West",
                      code: "W",
                    },
                  },
                  roomType: {
                    id: 1,
                    jwId: 10,
                    nameCn: "普通教室",
                    nameEn: "Classroom",
                    code: "CR",
                  },
                },
                teachers: [
                  {
                    id: 7,
                    personId: 701,
                    teacherId: 7001,
                    code: "T7001",
                    nameCn: "张老师",
                    nameEn: "Zhang",
                    age: null,
                    email: null,
                    telephone: null,
                    mobile: null,
                    address: null,
                    postcode: null,
                    qq: null,
                    wechat: null,
                    departmentId: 10,
                    teacherTitleId: 3,
                    department: {
                      id: 10,
                      code: "CS",
                      nameCn: "计算机学院",
                      nameEn: "School of CS",
                      isCollege: true,
                    },
                  },
                ],
                section: {
                  id: 1024,
                  jwId: 210001,
                  code: "COMP101.01",
                  bizTypeId: null,
                  credits: 3,
                  period: 48,
                  periodsPerWeek: 4,
                  timesPerWeek: 2,
                  stdCount: 60,
                  limitCount: 80,
                  graduateAndPostgraduate: null,
                  dateTimePlaceText: null,
                  dateTimePlacePersonText: null,
                  actualPeriods: 48,
                  theoryPeriods: 32,
                  practicePeriods: 16,
                  experimentPeriods: null,
                  machinePeriods: null,
                  designPeriods: null,
                  testPeriods: null,
                  scheduleState: null,
                  suggestScheduleWeeks: null,
                  suggestScheduleWeekInfo: null,
                  scheduleJsonParams: null,
                  selectedStdCount: 30,
                  remark: null,
                  scheduleRemark: null,
                  courseId: 1,
                  semesterId: 12,
                  campusId: 2,
                  examModeId: 1,
                  openDepartmentId: 10,
                  teachLanguageId: 1,
                  roomTypeId: 1,
                  course: {
                    id: 1,
                    jwId: 1001,
                    code: "COMP101",
                    nameCn: "计算机导论",
                    nameEn: "Introduction to CS",
                    categoryId: 2,
                    classTypeId: 3,
                    classifyId: 4,
                    educationLevelId: 1,
                    gradationId: 2,
                    typeId: 3,
                  },
                },
                scheduleGroup: {
                  id: 301,
                  jwId: 3001,
                  no: 1,
                  limitCount: 80,
                  stdCount: 60,
                  actualPeriods: 48,
                  isDefault: true,
                  sectionId: 1024,
                },
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Schedules"],
});

registry.registerPath({
  method: "get",
  path: "/api/homeworks",
  summary: "List section homeworks",
  request: {
    query: homeworksQuerySchema,
  },
  responses: {
    200: {
      description: "Homeworks list",
      content: {
        "application/json": {
          schema: homeworksListResponseSchema,
          example: {
            viewer: {
              userId: "usr_1",
              name: "Alice",
              image: null,
              isAdmin: false,
              isAuthenticated: true,
              isSuspended: false,
              suspensionReason: null,
              suspensionExpiresAt: null,
            },
            homeworks: [
              {
                id: "hw_1",
                title: "Homework 1",
                isMajor: false,
                requiresTeam: false,
                publishedAt: "2026-03-01T08:00:00.000Z",
                submissionStartAt: "2026-03-01T08:00:00.000Z",
                submissionDueAt: "2026-03-10T15:59:59.000Z",
                createdAt: "2026-02-28T08:00:00.000Z",
                updatedAt: "2026-02-28T08:00:00.000Z",
                deletedAt: null,
                sectionId: 1024,
                createdById: "usr_1",
                updatedById: "usr_1",
                deletedById: null,
                description: {
                  id: "desc_1",
                  content: "Solve chapter 1 exercises",
                  createdAt: "2026-02-28T08:00:00.000Z",
                  updatedAt: "2026-02-28T08:00:00.000Z",
                  lastEditedAt: "2026-02-28T08:00:00.000Z",
                  lastEditedById: "usr_1",
                  sectionId: null,
                  courseId: null,
                  teacherId: null,
                  homeworkId: "hw_1",
                },
                createdBy: {
                  id: "usr_1",
                  name: "Alice",
                  username: "alice01",
                  image: null,
                },
                updatedBy: {
                  id: "usr_1",
                  name: "Alice",
                  username: "alice01",
                  image: null,
                },
                deletedBy: null,
                completion: { completedAt: "2026-03-03T08:00:00.000Z" },
              },
            ],
            auditLogs: [
              {
                id: "log_1",
                action: "created",
                titleSnapshot: "Homework 1",
                createdAt: "2026-02-28T08:00:00.000Z",
                sectionId: 1024,
                homeworkId: "hw_1",
                actorId: "usr_1",
                actor: {
                  id: "usr_1",
                  name: "Alice",
                  username: "alice01",
                  image: null,
                },
              },
            ],
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "get",
  path: "/api/descriptions",
  summary: "Get description by target",
  request: {
    query: descriptionsQuerySchema,
  },
  responses: {
    200: {
      description: "Description response",
      content: {
        "application/json": {
          schema: descriptionsResponseSchema,
          example: {
            description: {
              id: "desc_1",
              content: "讲解清晰，节奏适中。",
              updatedAt: "2026-03-01T00:00:00.000Z",
              lastEditedAt: "2026-03-01T00:00:00.000Z",
              lastEditedBy: {
                id: "usr_1",
                name: "Alice",
                image: null,
                username: "alice01",
              },
            },
            history: [
              {
                id: "edit_1",
                createdAt: "2026-03-01T00:00:00.000Z",
                previousContent: null,
                nextContent: "讲解清晰，节奏适中。",
                editor: {
                  id: "usr_1",
                  name: "Alice",
                  image: null,
                  username: "alice01",
                },
              },
            ],
            viewer: {
              userId: "usr_1",
              name: "Alice",
              image: null,
              isAdmin: false,
              isAuthenticated: true,
              isSuspended: false,
              suspensionReason: null,
              suspensionExpiresAt: null,
            },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Descriptions"],
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  summary: "List users",
  request: {
    query: adminUsersQuerySchema,
  },
  responses: {
    200: {
      description: "Users list",
      content: {
        "application/json": {
          schema: adminUsersResponseSchema,
          example: {
            data: [
              {
                id: "usr_1",
                name: "Alice",
                username: "alice01",
                isAdmin: false,
                email: "alice@example.com",
                createdAt: "2025-09-01T00:00:00.000Z",
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "get",
  path: "/api/admin/comments",
  summary: "List moderation comments",
  request: {
    query: adminCommentsQuerySchema,
  },
  responses: {
    200: {
      description: "Moderation list",
      content: {
        "application/json": {
          schema: adminCommentsResponseSchema,
          example: {
            comments: [
              {
                id: "cmt_1",
                body: "作业难度适中。",
                visibility: "public",
                status: "active",
                isAnonymous: false,
                authorName: null,
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
                deletedAt: null,
                moderatedAt: null,
                moderationNote: null,
                userId: "usr_1",
                moderatedById: null,
                parentId: null,
                rootId: "cmt_1",
                sectionId: 1024,
                courseId: null,
                teacherId: null,
                sectionTeacherId: null,
                homeworkId: null,
                user: { name: "Alice" },
                section: { jwId: 210001, code: "COMP101.01" },
                course: {
                  jwId: 1001,
                  code: "COMP101",
                  nameCn: "计算机导论",
                },
                teacher: null,
                homework: null,
                sectionTeacher: null,
              },
            ],
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "get",
  path: "/api/semesters",
  summary: "List semesters",
  request: {
    query: paginationQuerySchema,
  },
  responses: {
    200: {
      description: "Semesters list",
      content: {
        "application/json": {
          schema: paginatedSemesterResponseSchema,
          example: {
            data: [
              {
                id: 12,
                jwId: 202601,
                nameCn: "2026 春",
                code: "2026S",
                startDate: "2026-02-15T00:00:00.000Z",
                endDate: "2026-07-10T00:00:00.000Z",
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Semesters"],
});

registry.registerPath({
  method: "get",
  path: "/api/uploads",
  summary: "List uploads",
  responses: {
    200: {
      description: "Uploads list",
      content: {
        "application/json": {
          schema: uploadsListResponseSchema,
          example: {
            maxFileSizeBytes: 10485760,
            quotaBytes: 1073741824,
            uploads: [
              {
                id: "upl_1",
                key: "uploads/user_1/notes-week3.pdf",
                filename: "notes-week3.pdf",
                size: 524288,
                createdAt: "2026-03-01T00:00:00.000Z",
              },
            ],
            usedBytes: 524288,
          },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "get",
  path: "/api/calendar-subscriptions/current",
  summary: "Get current user subscriptions",
  responses: {
    200: {
      description: "Current user subscriptions",
      content: {
        "application/json": {
          schema: z.union([
            z.object({ subscription: z.null() }),
            z.object({
              subscription: calendarSubscriptionSummarySchema,
              token: z.string(),
            }),
          ]),
          example: {
            subscription: { id: 77, sections: [{ id: 1024 }] },
            token: "eyJhbGciOi...",
          },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "post",
  path: "/api/descriptions",
  summary: "Create or update description for a target",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: descriptionUpsertRequestSchema,
          example: {
            targetType: "section",
            targetId: 1024,
            content: "Teacher explains clearly and pace is moderate.",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Description upsert result",
      content: {
        "application/json": {
          schema: descriptionUpsertResponseSchema,
          example: { id: "desc_1", updated: true },
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
          example: { error: "Invalid description request" },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Target not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Descriptions"],
});

registry.registerPath({
  method: "get",
  path: "/api/comments",
  summary: "List comments by target",
  request: {
    query: commentsQuerySchema,
  },
  responses: {
    200: {
      description: "Comments thread list",
      content: {
        "application/json": {
          schema: commentsListOpenApiSchema,
          example: {
            comments: [
              {
                id: "cmt_91ab",
                body: "讲课条理清晰。",
                visibility: "public",
                status: "active",
                author: {
                  id: "usr_1",
                  name: "Alice",
                  image: null,
                  isUstcVerified: true,
                  isAdmin: false,
                  isGuest: false,
                },
                authorHidden: false,
                isAnonymous: false,
                isAuthor: true,
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
                parentId: null,
                rootId: "cmt_91ab",
                replies: [
                  {
                    id: "cmt_91ac",
                    body: "回复：同意。",
                    visibility: "public",
                    status: "active",
                    author: {
                      id: "usr_2",
                      name: "Bob",
                      image: null,
                      isUstcVerified: false,
                      isAdmin: false,
                      isGuest: false,
                    },
                    authorHidden: false,
                    isAnonymous: false,
                    isAuthor: false,
                    createdAt: "2026-03-01T01:00:00.000Z",
                    updatedAt: "2026-03-01T01:00:00.000Z",
                    parentId: "cmt_91ab",
                    rootId: "cmt_91ab",
                    replies: [],
                    attachments: [
                      {
                        id: "att_1",
                        uploadId: "upl_1",
                        filename: "notes-week3.pdf",
                        url: "/api/uploads/upl_1/download",
                        contentType: "application/pdf",
                        size: 524288,
                      },
                    ],
                    reactions: [
                      { type: "upvote", count: 1, viewerHasReacted: false },
                    ],
                    canReply: true,
                    canEdit: false,
                    canModerate: false,
                  },
                ],
                attachments: [
                  {
                    id: "att_0",
                    uploadId: "upl_0",
                    filename: "slides.pdf",
                    url: "/api/uploads/upl_0/download",
                    contentType: "application/pdf",
                    size: 1048576,
                  },
                ],
                reactions: [
                  { type: "heart", count: 1, viewerHasReacted: true },
                ],
                canReply: true,
                canEdit: true,
                canModerate: false,
              },
            ],
            hiddenCount: 0,
            viewer: {
              userId: "usr_1",
              name: "Alice",
              image: null,
              isAdmin: false,
              isAuthenticated: true,
              isSuspended: false,
              suspensionReason: null,
              suspensionExpiresAt: null,
            },
            target: {
              type: "section",
              targetId: 1024,
              sectionId: 1024,
              teacherId: null,
              sectionTeacherId: null,
              homeworkId: null,
            },
          },
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "get",
  path: "/api/comments/{id}",
  summary: "Get comment thread and focus",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Comment thread",
      content: {
        "application/json": {
          schema: commentThreadOpenApiSchema,
          example: {
            thread: [
              {
                id: "cmt_91ab",
                body: "讲课条理清晰。",
                visibility: "public",
                status: "active",
                author: {
                  id: "usr_1",
                  name: "Alice",
                  image: null,
                  isUstcVerified: true,
                  isAdmin: false,
                  isGuest: false,
                },
                authorHidden: false,
                isAnonymous: false,
                isAuthor: true,
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
                parentId: null,
                rootId: "cmt_91ab",
                replies: [
                  {
                    id: "cmt_91ac",
                    body: "回复：同意。",
                    visibility: "public",
                    status: "active",
                    author: {
                      id: "usr_2",
                      name: "Bob",
                      image: null,
                      isUstcVerified: false,
                      isAdmin: false,
                      isGuest: false,
                    },
                    authorHidden: false,
                    isAnonymous: false,
                    isAuthor: false,
                    createdAt: "2026-03-01T01:00:00.000Z",
                    updatedAt: "2026-03-01T01:00:00.000Z",
                    parentId: "cmt_91ab",
                    rootId: "cmt_91ab",
                    replies: [],
                    attachments: [
                      {
                        id: "att_1",
                        uploadId: "upl_1",
                        filename: "notes-week3.pdf",
                        url: "/api/uploads/upl_1/download",
                        contentType: "application/pdf",
                        size: 524288,
                      },
                    ],
                    reactions: [
                      { type: "upvote", count: 1, viewerHasReacted: false },
                    ],
                    canReply: true,
                    canEdit: false,
                    canModerate: false,
                  },
                ],
                attachments: [
                  {
                    id: "att_0",
                    uploadId: "upl_0",
                    filename: "slides.pdf",
                    url: "/api/uploads/upl_0/download",
                    contentType: "application/pdf",
                    size: 1048576,
                  },
                ],
                reactions: [
                  { type: "heart", count: 1, viewerHasReacted: true },
                ],
                canReply: true,
                canEdit: true,
                canModerate: false,
              },
            ],
            focusId: "cmt_91ab",
            hiddenCount: 0,
            viewer: {
              userId: "usr_1",
              name: "Alice",
              image: null,
              isAdmin: false,
              isAuthenticated: true,
              isSuspended: false,
              suspensionReason: null,
              suspensionExpiresAt: null,
            },
            target: {
              sectionId: 1024,
              courseId: null,
              teacherId: null,
              sectionTeacherId: null,
              sectionTeacherSectionId: null,
              sectionTeacherTeacherId: null,
              sectionTeacherSectionJwId: null,
              sectionTeacherSectionCode: null,
              sectionTeacherTeacherName: null,
              sectionTeacherCourseJwId: null,
              sectionTeacherCourseName: null,
              homeworkId: null,
              homeworkTitle: null,
              homeworkSectionJwId: null,
              homeworkSectionCode: null,
              sectionJwId: 210001,
              sectionCode: "COMP101.01",
              courseJwId: 1001,
              courseName: "计算机导论",
              teacherName: null,
            },
          },
        },
      },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Comment not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "post",
  path: "/api/comments",
  summary: "Create comment",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: commentCreateRequestSchema,
          example: {
            targetType: "section",
            targetId: 1024,
            body: "This class has a lot of practical examples.",
            visibility: "public",
            isAnonymous: false,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Comment created",
      content: {
        "application/json": {
          schema: z.object({ id: z.string() }),
          example: { id: "cmt_91ab" },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Target not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "patch",
  path: "/api/comments/{id}",
  summary: "Update comment",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: commentUpdateRequestSchema,
          example: {
            body: "Updated opinion after midterm.",
            visibility: "logged_in_only",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Comment updated",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            comment: commentNodeOpenApiSchema,
          }),
          example: {
            success: true,
            comment: {
              id: "cmt_91ab",
              body: "Updated opinion after midterm.",
              visibility: "logged_in_only",
              status: "active",
              author: {
                id: "usr_1",
                name: "Alice",
                image: null,
                isUstcVerified: true,
                isAdmin: false,
                isGuest: false,
              },
              authorHidden: false,
              isAnonymous: false,
              isAuthor: true,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-02T00:00:00.000Z",
              parentId: null,
              rootId: "cmt_91ab",
              replies: [
                {
                  id: "cmt_91ac",
                  body: "回复：同意。",
                  visibility: "public",
                  status: "active",
                  author: {
                    id: "usr_2",
                    name: "Bob",
                    image: null,
                    isUstcVerified: false,
                    isAdmin: false,
                    isGuest: false,
                  },
                  authorHidden: false,
                  isAnonymous: false,
                  isAuthor: false,
                  createdAt: "2026-03-01T01:00:00.000Z",
                  updatedAt: "2026-03-01T01:00:00.000Z",
                  parentId: "cmt_91ab",
                  rootId: "cmt_91ab",
                  replies: [],
                  attachments: [
                    {
                      id: "att_1",
                      uploadId: "upl_1",
                      filename: "notes-week3.pdf",
                      url: "/api/uploads/upl_1/download",
                      contentType: "application/pdf",
                      size: 524288,
                    },
                  ],
                  reactions: [
                    { type: "upvote", count: 1, viewerHasReacted: false },
                  ],
                  canReply: true,
                  canEdit: false,
                  canModerate: false,
                },
              ],
              attachments: [
                {
                  id: "att_0",
                  uploadId: "upl_0",
                  filename: "slides.pdf",
                  url: "/api/uploads/upl_0/download",
                  contentType: "application/pdf",
                  size: 1048576,
                },
              ],
              reactions: [{ type: "heart", count: 1, viewerHasReacted: true }],
              canReply: true,
              canEdit: true,
              canModerate: false,
            },
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "post",
  path: "/api/comments/{id}/reactions",
  summary: "Add reaction",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: commentReactionRequestSchema,
          example: { type: "heart" },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reaction updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Comment not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "delete",
  path: "/api/comments/{id}/reactions",
  summary: "Remove reaction",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: commentReactionRequestSchema,
          example: { type: "heart" },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reaction removed",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "post",
  path: "/api/uploads",
  summary: "Create upload reservation",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: uploadCreateRequestSchema,
          example: {
            filename: "notes-week3.pdf",
            contentType: "application/pdf",
            size: "524288",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Upload reservation",
      content: {
        "application/json": {
          schema: uploadCreateResponseSchema,
          example: {
            url: "https://bucket.example.com/presigned",
            key: "uploads/user_1/notes-week3.pdf",
            maxFileSizeBytes: 10485760,
            quotaBytes: 1073741824,
            usedBytes: 0,
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    413: {
      description: "Payload too large",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "post",
  path: "/api/uploads/complete",
  summary: "Finalize upload",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: uploadCompleteRequestSchema,
          example: {
            key: "uploads/user_1/notes-week3.pdf",
            filename: "notes-week3.pdf",
            contentType: "application/pdf",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Upload finalized",
      content: {
        "application/json": {
          schema: uploadCompleteResponseSchema,
          example: {
            upload: {
              id: "upl_1",
              key: "uploads/user_1/notes-week3.pdf",
              filename: "notes-week3.pdf",
              size: 524288,
              createdAt: "2026-03-01T00:00:00.000Z",
            },
            usedBytes: 1048576,
            quotaBytes: 1073741824,
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    413: {
      description: "Payload too large",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "patch",
  path: "/api/uploads/{id}",
  summary: "Rename upload",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: uploadRenameRequestSchema,
          example: { filename: "notes-week3-updated.pdf" },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Upload renamed",
      content: {
        "application/json": {
          schema: uploadRenameResponseSchema,
          example: {
            upload: {
              id: "upl_1",
              key: "uploads/user_1/notes-week3.pdf",
              filename: "notes-week3-updated.pdf",
              size: 524288,
              createdAt: "2026-03-01T00:00:00.000Z",
            },
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Upload not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "post",
  path: "/api/calendar-subscriptions",
  summary: "Create calendar subscription",
  request: {
    body: {
      required: false,
      content: {
        "application/json": {
          schema: calendarSubscriptionCreateRequestSchema,
          example: { sectionIds: [1024, 2048] },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Subscription created",
      content: {
        "application/json": {
          schema: z.object({
            subscription: calendarSubscriptionSummarySchema,
            token: z.string(),
          }),
          example: {
            subscription: { id: 77, sections: [{ id: 1024 }, { id: 2048 }] },
            token: "eyJhbGciOi...",
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "patch",
  path: "/api/calendar-subscriptions/{id}",
  summary: "Update calendar subscription",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: calendarSubscriptionUpdateRequestSchema,
          example: { sectionIds: [1024] },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Subscription updated",
      content: {
        "application/json": {
          schema: calendarSubscriptionSummarySchema,
          example: { id: 77, sections: [{ id: 1024 }] },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "patch",
  path: "/api/homeworks/{id}",
  summary: "Update homework",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: homeworkUpdateRequestSchema,
          example: {
            title: "Homework 1 (updated)",
            submissionDueAt: "2026-03-12T15:59:59.000Z",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Homework updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
          example: { success: true },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "put",
  path: "/api/homeworks/{id}/completion",
  summary: "Update homework completion",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: homeworkCompletionRequestSchema,
          example: { completed: true },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Completion updated",
      content: {
        "application/json": {
          schema: homeworkCompletionResponseSchema,
          example: {
            completed: true,
            completedAt: "2026-03-03T08:00:00.000Z",
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/users/{id}",
  summary: "Update user by admin",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminUpdateUserRequestSchema,
          example: {
            name: "Alice",
            username: "alice01",
            isAdmin: false,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "User updated",
      content: {
        "application/json": {
          schema: adminUserResponseSchema,
          example: {
            user: {
              id: "usr_1",
              name: "Alice",
              username: "alice01",
              isAdmin: false,
              email: "alice@example.com",
              createdAt: "2025-09-01T00:00:00.000Z",
            },
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "post",
  path: "/api/locale",
  summary: "Update locale",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: localeUpdateRequestSchema,
          example: { locale: "zh-cn" },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Locale updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
          example: { success: true },
        },
      },
    },
    400: {
      description: "Invalid locale",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["System"],
});

registry.registerPath({
  method: "get",
  path: "/api/openapi",
  summary: "Get OpenAPI document",
  responses: {
    200: {
      description: "OpenAPI document",
      content: {
        "application/json": {
          schema: openApiDocumentSchema,
          example: {
            openapi: "3.1.0",
            info: { title: "Life@USTC API", version: "0.1.0" },
          },
        },
      },
    },
  },
  tags: ["System"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections/calendar.ics",
  summary: "Export multiple sections calendar",
  request: {
    query: z.object({ sectionIds: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "ICS calendar content",
      content: {
        "text/calendar": {
          schema: z.string(),
          example: "BEGIN:VCALENDAR\nVERSION:2.0\n...",
        },
      },
    },
    400: {
      description: "Invalid query",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "No sections found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections/{jwId}/calendar.ics",
  summary: "Export section calendar",
  request: {
    params: z.object({ jwId: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "ICS calendar content",
      content: {
        "text/calendar": {
          schema: z.string(),
          example: "BEGIN:VCALENDAR\nVERSION:2.0\n...",
        },
      },
    },
    400: {
      description: "Invalid section id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Section not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    500: {
      description: "Calendar generation failed",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/calendar-subscriptions/{id}/calendar.ics",
  summary: "Export subscription calendar",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    307: {
      description: "Redirect to generated sections calendar",
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
    400: {
      description: "Invalid id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Subscription or sections not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "get",
  path: "/api/uploads/{id}/download",
  summary: "Get upload download URL",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    307: {
      description: "Redirect to signed download URL",
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
    400: {
      description: "Invalid id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Upload not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections/{jwId}",
  summary: "Get section detail",
  request: {
    params: z.object({ jwId: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Section detail",
      content: {
        "application/json": {
          schema: sectionDetailSchema,
          example: {
            id: 1024,
            jwId: 210001,
            code: "COMP101.01",
            bizTypeId: null,
            credits: 3,
            period: 48,
            periodsPerWeek: 4,
            timesPerWeek: 2,
            stdCount: 60,
            limitCount: 80,
            graduateAndPostgraduate: null,
            dateTimePlaceText: "周一 3-4 节 西区教一-101",
            dateTimePlacePersonText: { room: "西区教一-101" },
            actualPeriods: 48,
            theoryPeriods: 32,
            practicePeriods: 16,
            experimentPeriods: null,
            machinePeriods: null,
            designPeriods: null,
            testPeriods: null,
            scheduleState: null,
            suggestScheduleWeeks: [1, 2, 3, 4],
            suggestScheduleWeekInfo: null,
            scheduleJsonParams: { weeks: 16 },
            selectedStdCount: 30,
            remark: null,
            scheduleRemark: null,
            courseId: 1,
            semesterId: 12,
            campusId: 2,
            examModeId: 1,
            openDepartmentId: 10,
            teachLanguageId: 1,
            roomTypeId: 1,
            course: {
              id: 1,
              jwId: 1001,
              code: "COMP101",
              nameCn: "计算机导论",
              nameEn: "Introduction to CS",
              categoryId: 2,
              classTypeId: 3,
              classifyId: 4,
              educationLevelId: 1,
              gradationId: 2,
              typeId: 3,
              category: { id: 2, nameCn: "通识", nameEn: "General" },
              classType: { id: 3, nameCn: "必修", nameEn: "Required" },
              classify: { id: 4, nameCn: "专业", nameEn: "Major" },
              educationLevel: {
                id: 1,
                nameCn: "本科",
                nameEn: "Undergraduate",
              },
              gradation: { id: 2, nameCn: "一级", nameEn: "Level 1" },
              type: { id: 3, nameCn: "理论", nameEn: "Lecture" },
            },
            semester: {
              id: 12,
              jwId: 202601,
              nameCn: "2026 春",
              code: "2026S",
              startDate: "2026-02-15T00:00:00.000Z",
              endDate: "2026-07-10T00:00:00.000Z",
            },
            campus: {
              id: 2,
              jwId: 20,
              nameCn: "西区",
              nameEn: "West",
              code: "W",
            },
            openDepartment: {
              id: 10,
              code: "CS",
              nameCn: "计算机学院",
              nameEn: "School of CS",
              isCollege: true,
            },
            examMode: { id: 1, nameCn: "闭卷", nameEn: "Closed" },
            teachLanguage: { id: 1, nameCn: "中文", nameEn: "Chinese" },
            roomType: {
              id: 1,
              jwId: 10,
              nameCn: "普通教室",
              nameEn: "Classroom",
              code: "CR",
            },
            schedules: [
              {
                id: 9001,
                periods: 2,
                date: "2026-03-02T00:00:00.000Z",
                weekday: 1,
                startTime: 3,
                endTime: 4,
                experiment: null,
                customPlace: null,
                lessonType: null,
                weekIndex: 2,
                exerciseClass: false,
                startUnit: 3,
                endUnit: 4,
                roomId: 101,
                sectionId: 1024,
                scheduleGroupId: 301,
              },
            ],
            scheduleGroups: [
              {
                id: 301,
                jwId: 3001,
                no: 1,
                limitCount: 80,
                stdCount: 60,
                actualPeriods: 48,
                isDefault: true,
                sectionId: 1024,
              },
            ],
            teachers: [
              {
                id: 7,
                personId: 701,
                teacherId: 7001,
                code: "T7001",
                nameCn: "张老师",
                nameEn: "Zhang",
                age: null,
                email: null,
                telephone: null,
                mobile: null,
                address: null,
                postcode: null,
                qq: null,
                wechat: null,
                departmentId: 10,
                teacherTitleId: 3,
                department: {
                  id: 10,
                  code: "CS",
                  nameCn: "计算机学院",
                  nameEn: "School of CS",
                  isCollege: true,
                },
                teacherTitle: {
                  id: 3,
                  jwId: 3001,
                  nameCn: "副教授",
                  nameEn: "Associate Professor",
                  code: "AP",
                  enabled: true,
                },
              },
            ],
            teacherAssignments: [
              {
                id: 501,
                teacherId: 7,
                sectionId: 1024,
                role: "主讲",
                period: 32,
                weekIndices: [1, 2, 3, 4],
                weekIndicesMsg: null,
                teacherLessonTypeId: 1,
                teacher: {
                  id: 7,
                  personId: 701,
                  teacherId: 7001,
                  code: "T7001",
                  nameCn: "张老师",
                  nameEn: "Zhang",
                  age: null,
                  email: null,
                  telephone: null,
                  mobile: null,
                  address: null,
                  postcode: null,
                  qq: null,
                  wechat: null,
                  departmentId: 10,
                  teacherTitleId: 3,
                },
                teacherLessonType: {
                  id: 1,
                  jwId: 100,
                  nameCn: "讲授",
                  nameEn: "Lecture",
                  code: "LEC",
                  role: "主讲",
                  enabled: true,
                },
              },
            ],
            exams: [
              {
                id: 401,
                jwId: 4001,
                examType: 1,
                startTime: 1,
                endTime: 2,
                examDate: "2026-06-20T00:00:00.000Z",
                examTakeCount: 60,
                examMode: "闭卷",
                examBatchId: 1,
                sectionId: 1024,
                examBatch: { id: 1, nameCn: "期末", nameEn: "Final" },
                examRooms: [
                  { id: 1, room: "教一-101", count: 60, examId: 401 },
                ],
              },
            ],
            adminClasses: [
              {
                id: 5,
                jwId: 5001,
                code: "CS2001",
                grade: "2024",
                nameCn: "计科 2024 级 1 班",
                nameEn: null,
                stdCount: 30,
                planCount: 32,
                enabled: true,
                abbrZh: "计科 1",
                abbrEn: "CS1",
              },
            ],
          },
        },
      },
    },
    400: {
      description: "Invalid section id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Section not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections/{jwId}/schedule-groups",
  summary: "List section schedule groups",
  request: {
    params: z.object({ jwId: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Schedule groups",
      content: {
        "application/json": {
          schema: z.array(scheduleGroupSchedulesSchema),
          example: [
            {
              schedules: [
                {
                  id: 9001,
                  periods: 2,
                  date: "2026-03-02T00:00:00.000Z",
                  weekday: 1,
                  startTime: 3,
                  endTime: 4,
                  experiment: null,
                  customPlace: null,
                  lessonType: null,
                  weekIndex: 2,
                  exerciseClass: false,
                  startUnit: 3,
                  endUnit: 4,
                  roomId: 101,
                  sectionId: 1024,
                  scheduleGroupId: 301,
                },
              ],
            },
          ],
        },
      },
    },
    400: {
      description: "Invalid section id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Section not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/sections/{jwId}/schedules",
  summary: "List section schedules",
  request: {
    params: z.object({ jwId: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Section schedules",
      content: {
        "application/json": {
          schema: z.array(scheduleWithGroupSchema),
          example: [
            {
              id: 9001,
              periods: 2,
              date: "2026-03-02T00:00:00.000Z",
              weekday: 1,
              startTime: 3,
              endTime: 4,
              experiment: null,
              customPlace: null,
              lessonType: null,
              weekIndex: 2,
              exerciseClass: false,
              startUnit: 3,
              endUnit: 4,
              roomId: 101,
              sectionId: 1024,
              scheduleGroupId: 301,
              room: {
                id: 101,
                jwId: 10001,
                nameCn: "教一-101",
                nameEn: null,
                code: "101",
                floor: 1,
                virtual: false,
                seatsForSection: 80,
                remark: null,
                seats: 120,
                buildingId: 11,
                roomTypeId: 1,
                building: {
                  id: 11,
                  jwId: 1101,
                  nameCn: "西区教一",
                  nameEn: null,
                  code: "W-1",
                  campusId: 2,
                  campus: {
                    id: 2,
                    jwId: 20,
                    nameCn: "西区",
                    nameEn: "West",
                    code: "W",
                  },
                },
                roomType: {
                  id: 1,
                  jwId: 10,
                  nameCn: "普通教室",
                  nameEn: "Classroom",
                  code: "CR",
                },
              },
              teachers: [
                {
                  id: 7,
                  personId: 701,
                  teacherId: 7001,
                  code: "T7001",
                  nameCn: "张老师",
                  nameEn: "Zhang",
                  age: null,
                  email: null,
                  telephone: null,
                  mobile: null,
                  address: null,
                  postcode: null,
                  qq: null,
                  wechat: null,
                  departmentId: 10,
                  teacherTitleId: 3,
                  department: {
                    id: 10,
                    code: "CS",
                    nameCn: "计算机学院",
                    nameEn: "School of CS",
                    isCollege: true,
                  },
                },
              ],
              scheduleGroup: {
                id: 301,
                jwId: 3001,
                no: 1,
                limitCount: 80,
                stdCount: 60,
                actualPeriods: 48,
                isDefault: true,
                sectionId: 1024,
              },
            },
          ],
        },
      },
    },
    400: {
      description: "Invalid section id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Section not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "delete",
  path: "/api/comments/{id}",
  summary: "Delete comment",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Delete success",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
          example: { success: true },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Comments"],
});

registry.registerPath({
  method: "delete",
  path: "/api/homeworks/{id}",
  summary: "Delete homework",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Delete success",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
          example: { success: true },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "delete",
  path: "/api/uploads/{id}",
  summary: "Delete upload",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Delete success",
      content: {
        "application/json": {
          schema: z.object({ deletedId: z.string(), deletedSize: z.number() }),
          example: { deletedId: "upl_1", deletedSize: 524288 },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Uploads"],
});

registry.registerPath({
  method: "get",
  path: "/api/calendar-subscriptions/{id}",
  summary: "Get subscription detail",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Subscription detail",
      content: {
        "application/json": {
          schema: calendarSubscriptionSchema,
          example: {
            id: 77,
            userId: "usr_1",
            sections: [
              {
                id: 1024,
                jwId: 210001,
                code: "COMP101.01",
                bizTypeId: null,
                credits: 3,
                period: 48,
                periodsPerWeek: 4,
                timesPerWeek: 2,
                stdCount: 60,
                limitCount: 80,
                graduateAndPostgraduate: null,
                dateTimePlaceText: "周一 3-4 节 西区教一-101",
                dateTimePlacePersonText: { room: "西区教一-101" },
                actualPeriods: 48,
                theoryPeriods: 32,
                practicePeriods: 16,
                experimentPeriods: null,
                machinePeriods: null,
                designPeriods: null,
                testPeriods: null,
                scheduleState: null,
                suggestScheduleWeeks: [1, 2, 3, 4],
                suggestScheduleWeekInfo: null,
                scheduleJsonParams: { weeks: 16 },
                selectedStdCount: 30,
                remark: null,
                scheduleRemark: null,
                courseId: 1,
                semesterId: 12,
                campusId: 2,
                examModeId: 1,
                openDepartmentId: 10,
                teachLanguageId: 1,
                roomTypeId: 1,
                course: {
                  id: 1,
                  jwId: 1001,
                  code: "COMP101",
                  nameCn: "计算机导论",
                  nameEn: "Introduction to CS",
                  categoryId: 2,
                  classTypeId: 3,
                  classifyId: 4,
                  educationLevelId: 1,
                  gradationId: 2,
                  typeId: 3,
                },
                semester: {
                  id: 12,
                  jwId: 202601,
                  nameCn: "2026 春",
                  code: "2026S",
                  startDate: "2026-02-15T00:00:00.000Z",
                  endDate: "2026-07-10T00:00:00.000Z",
                },
                campus: {
                  id: 2,
                  jwId: 20,
                  nameCn: "西区",
                  nameEn: "West",
                  code: "W",
                },
                schedules: [
                  {
                    id: 9001,
                    periods: 2,
                    date: "2026-03-02T00:00:00.000Z",
                    weekday: 1,
                    startTime: 3,
                    endTime: 4,
                    experiment: null,
                    customPlace: null,
                    lessonType: null,
                    weekIndex: 2,
                    exerciseClass: false,
                    startUnit: 3,
                    endUnit: 4,
                    roomId: 101,
                    sectionId: 1024,
                    scheduleGroupId: 301,
                    room: {
                      id: 101,
                      jwId: 10001,
                      nameCn: "教一-101",
                      nameEn: null,
                      code: "101",
                      floor: 1,
                      virtual: false,
                      seatsForSection: 80,
                      remark: null,
                      seats: 120,
                      buildingId: 11,
                      roomTypeId: 1,
                      building: {
                        id: 11,
                        jwId: 1101,
                        nameCn: "西区教一",
                        nameEn: null,
                        code: "W-1",
                        campusId: 2,
                      },
                      roomType: {
                        id: 1,
                        jwId: 10,
                        nameCn: "普通教室",
                        nameEn: "Classroom",
                        code: "CR",
                      },
                    },
                    teachers: [
                      {
                        id: 7,
                        personId: 701,
                        teacherId: 7001,
                        code: "T7001",
                        nameCn: "张老师",
                        nameEn: "Zhang",
                        age: null,
                        email: null,
                        telephone: null,
                        mobile: null,
                        address: null,
                        postcode: null,
                        qq: null,
                        wechat: null,
                        departmentId: 10,
                        teacherTitleId: 3,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
    400: {
      description: "Invalid id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "delete",
  path: "/api/calendar-subscriptions/{id}",
  summary: "Delete subscription",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Delete success",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
          example: { success: true },
        },
      },
    },
    400: {
      description: "Invalid id",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Calendar"],
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/comments/{id}",
  summary: "Moderate comment",
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminModerateCommentRequestSchema,
          example: {
            status: "softbanned",
            moderationNote: "Contains personal attack",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Comment moderated",
      content: {
        "application/json": {
          schema: z.object({ comment: adminModeratedCommentSchema }),
          example: {
            comment: {
              id: "cmt_1",
              body: "作业难度适中。",
              visibility: "public",
              status: "softbanned",
              isAnonymous: false,
              authorName: null,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
              deletedAt: null,
              moderatedAt: "2026-03-02T00:00:00.000Z",
              moderationNote: "Contains personal attack",
              userId: "usr_1",
              moderatedById: "admin_1",
              parentId: null,
              rootId: "cmt_1",
              sectionId: 1024,
              courseId: null,
              teacherId: null,
              sectionTeacherId: null,
              homeworkId: null,
            },
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Comment not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "get",
  path: "/api/admin/suspensions",
  summary: "List suspensions",
  responses: {
    200: {
      description: "Suspensions list",
      content: {
        "application/json": {
          schema: adminSuspensionsResponseSchema,
          example: {
            suspensions: [
              {
                id: "sus_1",
                userId: "usr_1",
                createdById: "admin_1",
                createdAt: "2026-03-01T00:00:00.000Z",
                reason: "Spam",
                note: "Repeated abusive content",
                expiresAt: "2026-12-31T00:00:00.000Z",
                liftedAt: null,
                liftedById: null,
                user: { id: "usr_1", name: "Alice" },
              },
            ],
          },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "post",
  path: "/api/admin/suspensions",
  summary: "Create suspension",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: adminCreateSuspensionRequestSchema,
          example: {
            userId: "usr_1",
            reason: "Spam",
            note: "Repeated abusive content",
            expiresAt: "2026-12-31T00:00:00.000Z",
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Suspension created",
      content: {
        "application/json": {
          schema: adminSuspensionResponseSchema,
          example: {
            suspension: {
              id: "sus_1",
              userId: "usr_1",
              createdById: "admin_1",
              createdAt: "2026-03-01T00:00:00.000Z",
              reason: "Spam",
              note: "Repeated abusive content",
              expiresAt: "2026-12-31T00:00:00.000Z",
              liftedAt: null,
              liftedById: null,
              user: { id: "usr_1", name: "Alice" },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid payload",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/suspensions/{id}",
  summary: "Lift suspension",
  request: {
    params: z.object({ id: z.string().min(1) }),
  },
  responses: {
    200: {
      description: "Suspension lifted",
      content: {
        "application/json": {
          schema: adminSuspensionResponseSchema,
          example: {
            suspension: {
              id: "sus_1",
              userId: "usr_1",
              createdById: "admin_1",
              createdAt: "2026-03-01T00:00:00.000Z",
              reason: "Spam",
              note: "Repeated abusive content",
              expiresAt: "2026-12-31T00:00:00.000Z",
              liftedAt: "2026-03-10T00:00:00.000Z",
              liftedById: "admin_1",
              user: { id: "usr_1", name: "Alice" },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
    404: {
      description: "Suspension not found",
      content: { "application/json": { schema: openApiErrorSchema } },
    },
  },
  tags: ["Admin"],
});

registry.registerPath({
  method: "get",
  path: "/api/metadata",
  summary: "Get metadata summary",
  responses: {
    200: {
      description: "Metadata payload",
      content: {
        "application/json": {
          schema: metadataResponseSchema,
          example: {
            educationLevels: [
              { id: 1, nameCn: "本科", nameEn: "Undergraduate" },
            ],
            courseCategories: [{ id: 2, nameCn: "通识", nameEn: "General" }],
            courseClassifies: [{ id: 4, nameCn: "专业", nameEn: "Major" }],
            classTypes: [{ id: 3, nameCn: "必修", nameEn: "Required" }],
            courseTypes: [{ id: 3, nameCn: "理论", nameEn: "Lecture" }],
            courseGradations: [{ id: 2, nameCn: "一级", nameEn: "Level 1" }],
            examModes: [{ id: 1, nameCn: "闭卷", nameEn: "Closed" }],
            teachLanguages: [{ id: 1, nameCn: "中文", nameEn: "Chinese" }],
            campuses: [
              {
                id: 2,
                jwId: 20,
                nameCn: "西区",
                nameEn: "West",
                code: "W",
                buildings: [
                  {
                    id: 11,
                    jwId: 1101,
                    nameCn: "西区教一",
                    nameEn: null,
                    code: "W-1",
                    campusId: 2,
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
  tags: ["System"],
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Life@USTC API",
      version: "0.1.0",
      description: "Life@USTC Next.js API specification.",
    },
  });
}
