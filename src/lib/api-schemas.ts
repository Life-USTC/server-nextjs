import { z } from "zod";
import {
  AdminClassModelSchema,
  BuildingModelSchema,
  CampusModelSchema,
  ClassTypeModelSchema,
  CommentModelSchema,
  CourseCategoryModelSchema,
  CourseClassifyModelSchema,
  CourseGradationModelSchema,
  CourseModelSchema,
  CourseTypeModelSchema,
  DepartmentModelSchema,
  DescriptionEditModelSchema,
  DescriptionModelSchema,
  EducationLevelModelSchema,
  ExamBatchModelSchema,
  ExamModelSchema,
  ExamModeModelSchema,
  ExamRoomModelSchema,
  HomeworkAuditLogModelSchema,
  HomeworkCompletionModelSchema,
  HomeworkModelSchema,
  RoomModelSchema,
  RoomTypeModelSchema,
  ScheduleGroupModelSchema,
  ScheduleModelSchema,
  SectionModelSchema,
  SemesterModelSchema,
  TeacherAssignmentModelSchema,
  TeacherLessonTypeModelSchema,
  TeacherModelSchema,
  TeacherTitleModelSchema,
  TeachLanguageModelSchema,
  UploadModelSchema,
  UserModelSchema,
  UserSuspensionModelSchema,
} from "@/generated/zod/schemas/variants/pure/index";
import type {
  descriptionUpsertRequestSchema,
  homeworkCreateRequestSchema,
  matchSectionCodesRequestSchema,
} from "@/lib/api-schemas/request-schemas";

export * from "@/lib/api-schemas/request-schemas";

const dateTimeSchema = z.string().datetime();

const dateTimePlacePersonTextSchema = z
  .object({ room: z.string().optional() })
  .passthrough()
  .nullable();

const suggestScheduleWeeksSchema = z.array(z.number().int()).nullable();

const scheduleJsonParamsSchema = z
  .object({ weeks: z.number().int().optional() })
  .passthrough()
  .nullable();

const teacherAssignmentWeekIndicesSchema = z.array(z.number().int()).nullable();

export const campusSchema = CampusModelSchema.omit({
  buildings: true,
  sections: true,
});

export const buildingSchema = BuildingModelSchema.omit({
  campus: true,
  rooms: true,
});

export const buildingWithCampusSchema = buildingSchema.extend({
  campus: campusSchema.nullable(),
});

export const roomTypeSchema = RoomTypeModelSchema.omit({
  rooms: true,
  sections: true,
});

export const roomSchema = RoomModelSchema.omit({
  building: true,
  roomType: true,
  schedules: true,
});

export const roomWithBuildingSchema = roomSchema.extend({
  building: buildingSchema.nullable(),
  roomType: roomTypeSchema.nullable(),
});

export const roomWithBuildingCampusSchema = roomSchema.extend({
  building: buildingWithCampusSchema.nullable(),
  roomType: roomTypeSchema.nullable(),
});

export const departmentSchema = DepartmentModelSchema.omit({
  sections: true,
  teachers: true,
});

export const teacherTitleSchema = TeacherTitleModelSchema.omit({
  teachers: true,
});

export const teacherLessonTypeSchema = TeacherLessonTypeModelSchema.omit({
  teacherAssignments: true,
});

export const teacherSchema = TeacherModelSchema.omit({
  department: true,
  teacherTitle: true,
  sections: true,
  sectionTeachers: true,
  teacherAssignments: true,
  schedules: true,
  comments: true,
  description: true,
});

export const teacherListSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
  teacherTitle: teacherTitleSchema.nullable(),
  _count: z.object({ sections: z.number().int() }),
});

export const teacherWithDepartmentSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
});

export const teacherWithDepartmentTitleSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
  teacherTitle: teacherTitleSchema.nullable(),
});

export const courseCategorySchema = CourseCategoryModelSchema.omit({
  courses: true,
});
export const courseClassifySchema = CourseClassifyModelSchema.omit({
  courses: true,
});
export const courseGradationSchema = CourseGradationModelSchema.omit({
  courses: true,
});
export const courseTypeSchema = CourseTypeModelSchema.omit({
  courses: true,
});
export const classTypeSchema = ClassTypeModelSchema.omit({
  courses: true,
});
export const educationLevelSchema = EducationLevelModelSchema.omit({
  courses: true,
});
export const examModeSchema = ExamModeModelSchema.omit({
  sections: true,
});
export const teachLanguageSchema = TeachLanguageModelSchema.omit({
  sections: true,
});

export const courseBaseSchema = CourseModelSchema.omit({
  category: true,
  classType: true,
  classify: true,
  educationLevel: true,
  gradation: true,
  type: true,
  sections: true,
  comments: true,
  description: true,
});

export const courseSchema = courseBaseSchema.extend({
  category: courseCategorySchema.nullable(),
  classType: classTypeSchema.nullable(),
  classify: courseClassifySchema.nullable(),
  educationLevel: educationLevelSchema.nullable(),
  gradation: courseGradationSchema.nullable(),
  type: courseTypeSchema.nullable(),
});

export const semesterSchema = SemesterModelSchema.omit({
  sections: true,
}).extend({
  startDate: dateTimeSchema.nullable(),
  endDate: dateTimeSchema.nullable(),
});

export const adminClassSchema = AdminClassModelSchema.omit({
  sections: true,
});

export const sectionBaseSchema = SectionModelSchema.omit({
  course: true,
  semester: true,
  campus: true,
  examMode: true,
  openDepartment: true,
  teachLanguage: true,
  roomType: true,
  schedules: true,
  scheduleGroups: true,
  adminClasses: true,
  teachers: true,
  sectionTeachers: true,
  teacherAssignments: true,
  exams: true,
  calendarSubscriptions: true,
  comments: true,
  description: true,
  homeworks: true,
  homeworkAuditLogs: true,
}).extend({
  dateTimePlacePersonText: dateTimePlacePersonTextSchema,
  suggestScheduleWeeks: suggestScheduleWeeksSchema,
  scheduleJsonParams: scheduleJsonParamsSchema,
});

export const sectionCompactSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  openDepartment: departmentSchema.nullable(),
  teachers: z.array(teacherSchema),
});

export const sectionListSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  openDepartment: departmentSchema.nullable(),
  examMode: examModeSchema.nullable(),
  teachLanguage: teachLanguageSchema.nullable(),
  teachers: z.array(teacherSchema),
  adminClasses: z.array(adminClassSchema),
});

export const scheduleBaseSchema = ScheduleModelSchema.omit({
  room: true,
  section: true,
  scheduleGroup: true,
  teachers: true,
}).extend({
  date: dateTimeSchema.nullable(),
});

export const scheduleGroupSchema = ScheduleGroupModelSchema.omit({
  section: true,
  schedules: true,
});

export const scheduleWithRelationsSchema = scheduleBaseSchema.extend({
  room: roomWithBuildingCampusSchema.nullable(),
  teachers: z.array(teacherWithDepartmentSchema),
  section: sectionBaseSchema.extend({
    course: courseBaseSchema,
  }),
  scheduleGroup: scheduleGroupSchema,
});

export const scheduleWithGroupSchema = scheduleBaseSchema.extend({
  room: roomWithBuildingCampusSchema.nullable(),
  teachers: z.array(teacherWithDepartmentSchema),
  scheduleGroup: scheduleGroupSchema,
});

export const scheduleWithRoomTeachersSchema = scheduleBaseSchema.extend({
  room: roomWithBuildingSchema.nullable(),
  teachers: z.array(teacherSchema),
});

export const examRoomSchema = ExamRoomModelSchema.omit({
  exam: true,
});

export const examBatchSchema = ExamBatchModelSchema.omit({
  exams: true,
});

export const examSchema = ExamModelSchema.omit({
  examBatch: true,
  section: true,
  examRooms: true,
}).extend({
  examDate: dateTimeSchema.nullable(),
  examBatch: examBatchSchema.nullable(),
  examRooms: z.array(examRoomSchema),
});

export const teacherAssignmentSchema = TeacherAssignmentModelSchema.omit({
  teacher: true,
  section: true,
  teacherLessonType: true,
}).extend({
  weekIndices: teacherAssignmentWeekIndicesSchema,
  teacher: teacherSchema,
  teacherLessonType: teacherLessonTypeSchema.nullable(),
});

export const sectionDetailSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  openDepartment: departmentSchema.nullable(),
  examMode: examModeSchema.nullable(),
  teachLanguage: teachLanguageSchema.nullable(),
  roomType: roomTypeSchema.nullable(),
  schedules: z.array(scheduleBaseSchema),
  scheduleGroups: z.array(scheduleGroupSchema),
  teachers: z.array(teacherWithDepartmentTitleSchema),
  teacherAssignments: z.array(teacherAssignmentSchema),
  exams: z.array(examSchema),
  adminClasses: z.array(adminClassSchema),
});

export const scheduleGroupSchedulesSchema = z.object({
  schedules: z.array(scheduleBaseSchema),
});

export const commentAuthorSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable(),
  image: z.string().nullable().optional(),
  isUstcVerified: z.boolean(),
  isAdmin: z.boolean(),
  isGuest: z.boolean(),
});

export const commentAttachmentSummarySchema = z.object({
  id: z.string(),
  uploadId: z.string(),
  filename: z.string(),
  url: z.string(),
  contentType: z.string().nullable(),
  size: z.number().int(),
});

export const commentReactionSummarySchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative(),
  viewerHasReacted: z.boolean(),
});

type CommentAuthorSummary = {
  id?: string;
  name: string | null;
  image?: string | null;
  isUstcVerified: boolean;
  isAdmin: boolean;
  isGuest: boolean;
};

type CommentAttachmentSummary = {
  id: string;
  uploadId: string;
  filename: string;
  url: string;
  contentType: string | null;
  size: number;
};

type CommentReactionSummary = {
  type: string;
  count: number;
  viewerHasReacted: boolean;
};

type CommentNodeDto = {
  id: string;
  body: string;
  visibility: string;
  status: string;
  author: CommentAuthorSummary | null;
  authorHidden: boolean;
  isAnonymous: boolean;
  isAuthor: boolean;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  rootId: string | null;
  replies: CommentNodeDto[];
  attachments: CommentAttachmentSummary[];
  reactions: CommentReactionSummary[];
  canReply: boolean;
  canEdit: boolean;
  canModerate: boolean;
};

export const commentNodeSchema: z.ZodType<CommentNodeDto> = z.lazy(() =>
  z.object({
    id: z.string(),
    body: z.string(),
    visibility: z.string(),
    status: z.string(),
    author: commentAuthorSummarySchema.nullable(),
    authorHidden: z.boolean(),
    isAnonymous: z.boolean(),
    isAuthor: z.boolean(),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    parentId: z.string().nullable(),
    rootId: z.string().nullable(),
    replies: z.array(commentNodeSchema),
    attachments: z.array(commentAttachmentSummarySchema),
    reactions: z.array(commentReactionSummarySchema),
    canReply: z.boolean(),
    canEdit: z.boolean(),
    canModerate: z.boolean(),
  }),
);

export const viewerContextSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  isAdmin: z.boolean(),
  isAuthenticated: z.boolean(),
  isSuspended: z.boolean(),
  suspensionReason: z.string().nullable(),
  suspensionExpiresAt: dateTimeSchema.nullable(),
});

export const commentsListResponseSchema = z.object({
  comments: z.array(commentNodeSchema),
  hiddenCount: z.number().int().nonnegative(),
  viewer: viewerContextSchema,
  target: z.object({
    type: z.string(),
    targetId: z.union([z.number().int(), z.string(), z.null()]),
    sectionId: z.number().int().nullable(),
    teacherId: z.number().int().nullable(),
    sectionTeacherId: z.number().int().nullable(),
    homeworkId: z.string().nullable(),
  }),
});

export const commentThreadResponseSchema = z.object({
  thread: z.array(commentNodeSchema),
  focusId: z.string(),
  hiddenCount: z.number().int().nonnegative(),
  viewer: viewerContextSchema,
  target: z.object({
    sectionId: z.number().int().nullable(),
    courseId: z.number().int().nullable(),
    teacherId: z.number().int().nullable(),
    sectionTeacherId: z.number().int().nullable(),
    sectionTeacherSectionId: z.number().int().nullable(),
    sectionTeacherTeacherId: z.number().int().nullable(),
    sectionTeacherSectionJwId: z.number().int().nullable(),
    sectionTeacherSectionCode: z.string().nullable(),
    sectionTeacherTeacherName: z.string().nullable(),
    sectionTeacherCourseJwId: z.number().int().nullable(),
    sectionTeacherCourseName: z.string().nullable(),
    homeworkId: z.string().nullable(),
    homeworkTitle: z.string().nullable(),
    homeworkSectionJwId: z.number().int().nullable(),
    homeworkSectionCode: z.string().nullable(),
    sectionJwId: z.number().int().nullable(),
    sectionCode: z.string().nullable(),
    courseJwId: z.number().int().nullable(),
    courseName: z.string().nullable(),
    teacherName: z.string().nullable(),
  }),
});

const descriptionBaseSchema = DescriptionModelSchema.omit({
  lastEditedBy: true,
  section: true,
  course: true,
  teacher: true,
  homework: true,
  edits: true,
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  lastEditedAt: dateTimeSchema.nullable(),
});

const descriptionEditBaseSchema = DescriptionEditModelSchema.omit({
  description: true,
  editor: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const descriptionHistoryEntrySchema = descriptionEditBaseSchema
  .pick({
    id: true,
    createdAt: true,
    previousContent: true,
    nextContent: true,
  })
  .extend({
    editor: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  });

export const descriptionDetailSchema = descriptionBaseSchema
  .pick({ id: true, content: true, updatedAt: true, lastEditedAt: true })
  .extend({
    id: z.string().nullable(),
    lastEditedBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  });

export const descriptionsResponseSchema = z.object({
  description: descriptionDetailSchema,
  history: z.array(descriptionHistoryEntrySchema),
  viewer: viewerContextSchema,
});

export const homeworkUserSummarySchema = UserModelSchema.pick({
  id: true,
  name: true,
  username: true,
  image: true,
});

export const homeworkDescriptionSchema = descriptionBaseSchema.pick({
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  lastEditedAt: true,
  lastEditedById: true,
  sectionId: true,
  courseId: true,
  teacherId: true,
  homeworkId: true,
});

const homeworkBaseSchema = HomeworkModelSchema.omit({
  section: true,
  createdBy: true,
  updatedBy: true,
  deletedBy: true,
  description: true,
  comments: true,
  auditLogs: true,
  homeworkCompletions: true,
}).extend({
  publishedAt: dateTimeSchema.nullable(),
  submissionStartAt: dateTimeSchema.nullable(),
  submissionDueAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
});

export const homeworkListItemSchema = homeworkBaseSchema.extend({
  description: homeworkDescriptionSchema.nullable(),
  createdBy: homeworkUserSummarySchema.nullable(),
  updatedBy: homeworkUserSummarySchema.nullable(),
  deletedBy: homeworkUserSummarySchema.nullable(),
  completion: HomeworkCompletionModelSchema.pick({
    completedAt: true,
  })
    .extend({ completedAt: dateTimeSchema })
    .nullable(),
});

const homeworkAuditLogBaseSchema = HomeworkAuditLogModelSchema.omit({
  section: true,
  homework: true,
  actor: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const homeworkAuditLogSchema = homeworkAuditLogBaseSchema.extend({
  actor: homeworkUserSummarySchema.nullable(),
});

export const homeworksListResponseSchema = z.object({
  viewer: viewerContextSchema,
  homeworks: z.array(homeworkListItemSchema),
  auditLogs: z.array(homeworkAuditLogSchema),
});

export const homeworkCompletionResponseSchema = z.object({
  completed: z.boolean(),
  completedAt: dateTimeSchema.nullable(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: paginationMetaSchema,
  });

const createCollectionResponseSchema = <
  Key extends string,
  ItemSchema extends z.ZodTypeAny,
>(
  key: Key,
  itemSchema: ItemSchema,
) =>
  z.object({
    [key]: z.array(itemSchema),
  } as Record<Key, z.ZodArray<ItemSchema>>);

const createEntityResponseSchema = <
  Key extends string,
  EntitySchema extends z.ZodTypeAny,
>(
  key: Key,
  entitySchema: EntitySchema,
) =>
  z.object({
    [key]: entitySchema,
  } as Record<Key, EntitySchema>);

export const paginatedCourseResponseSchema =
  createPaginatedResponseSchema(courseSchema);

export const paginatedSectionResponseSchema =
  createPaginatedResponseSchema(sectionListSchema);

export const paginatedTeacherResponseSchema =
  createPaginatedResponseSchema(teacherListSchema);

export const paginatedScheduleResponseSchema = createPaginatedResponseSchema(
  scheduleWithRelationsSchema,
);

export const paginatedSemesterResponseSchema =
  createPaginatedResponseSchema(semesterSchema);

const adminUserBaseSchema = UserModelSchema.pick({
  id: true,
  name: true,
  username: true,
  isAdmin: true,
  createdAt: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const adminUserListItemSchema = adminUserBaseSchema.extend({
  email: z.string().nullable(),
});

export const adminUsersResponseSchema = createPaginatedResponseSchema(
  adminUserListItemSchema,
);

export const adminUserResponseSchema = createEntityResponseSchema(
  "user",
  adminUserListItemSchema,
);

export const adminCommentUserSchema = UserModelSchema.pick({ name: true });

const adminCommentBaseSchema = CommentModelSchema.omit({
  user: true,
  moderatedBy: true,
  parent: true,
  replies: true,
  root: true,
  thread: true,
  section: true,
  course: true,
  teacher: true,
  sectionTeacher: true,
  homework: true,
  attachments: true,
  reactions: true,
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
  moderatedAt: dateTimeSchema.nullable(),
});

export const adminCommentSchema = adminCommentBaseSchema.extend({
  user: adminCommentUserSchema.nullable(),
  section: z.object({ jwId: z.number().int(), code: z.string() }).nullable(),
  course: z
    .object({
      jwId: z.number().int(),
      code: z.string(),
      nameCn: z.string(),
    })
    .nullable(),
  teacher: z.object({ id: z.number().int(), nameCn: z.string() }).nullable(),
  homework: z
    .object({
      id: z.string(),
      title: z.string(),
      section: z.object({ code: z.string() }),
    })
    .nullable(),
  sectionTeacher: z
    .object({
      section: z.object({ jwId: z.number().int(), code: z.string() }),
      teacher: z.object({ nameCn: z.string() }),
    })
    .nullable(),
});

export const adminCommentsResponseSchema = createCollectionResponseSchema(
  "comments",
  adminCommentSchema,
);

export const adminModeratedCommentSchema = adminCommentBaseSchema;

export const adminModeratedCommentResponseSchema = z.object({
  comment: adminModeratedCommentSchema,
});

export const adminSuspensionUserSchema = UserModelSchema.pick({
  id: true,
  name: true,
});

const adminSuspensionBaseSchema = UserSuspensionModelSchema.omit({
  user: true,
  createdBy: true,
  liftedBy: true,
}).extend({
  createdAt: dateTimeSchema,
  expiresAt: dateTimeSchema.nullable(),
  liftedAt: dateTimeSchema.nullable(),
});

export const adminSuspensionSchema = adminSuspensionBaseSchema.extend({
  user: adminSuspensionUserSchema.nullable(),
});

export const adminSuspensionsResponseSchema = createCollectionResponseSchema(
  "suspensions",
  adminSuspensionSchema,
);

export const adminSuspensionResponseSchema = createEntityResponseSchema(
  "suspension",
  adminSuspensionSchema,
);

const uploadSummarySchema = UploadModelSchema.pick({
  id: true,
  key: true,
  filename: true,
  size: true,
  createdAt: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const uploadsListResponseSchema = z.object({
  maxFileSizeBytes: z.number().int(),
  quotaBytes: z.number().int(),
  uploads: z.array(uploadSummarySchema),
  usedBytes: z.number().int(),
});

export const uploadCreateResponseSchema = z.object({
  key: z.string(),
  url: z.string(),
  maxFileSizeBytes: z.number().int(),
  quotaBytes: z.number().int(),
  usedBytes: z.number().int(),
});

export const uploadCompleteResponseSchema = z.object({
  upload: uploadSummarySchema,
  usedBytes: z.number().int(),
  quotaBytes: z.number().int(),
});

export const uploadRenameResponseSchema = createEntityResponseSchema(
  "upload",
  uploadSummarySchema,
);

export const calendarSubscriptionSchema = z.object({
  id: z.number().int(),
  userId: z.string().nullable(),
  sections: z.array(
    sectionBaseSchema.extend({
      course: courseBaseSchema,
      semester: semesterSchema.nullable(),
      campus: campusSchema.nullable(),
      schedules: z.array(scheduleWithRoomTeachersSchema),
    }),
  ),
});

export const calendarSubscriptionSummarySchema = z.object({
  id: z.number().int(),
  sections: z.array(z.object({ id: z.number().int() })),
});

export const metadataResponseSchema = z.object({
  educationLevels: z.array(educationLevelSchema),
  courseCategories: z.array(courseCategorySchema),
  courseClassifies: z.array(courseClassifySchema),
  classTypes: z.array(classTypeSchema),
  courseTypes: z.array(courseTypeSchema),
  courseGradations: z.array(courseGradationSchema),
  examModes: z.array(examModeSchema),
  teachLanguages: z.array(teachLanguageSchema),
  campuses: z.array(
    campusSchema.extend({ buildings: z.array(buildingSchema) }),
  ),
});

export const successResponseSchema = z.object({
  success: z.boolean(),
});

export const idResponseSchema = z.object({
  id: z.string(),
});

export const descriptionUpsertResponseSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
});

export const matchSectionCodesResponseSchema = z.object({
  semester: z.object({
    id: z.number().int(),
    nameCn: z.string().nullable(),
    code: z.string().nullable(),
  }),
  matchedCodes: z.array(z.string()),
  unmatchedCodes: z.array(z.string()),
  sections: z.array(sectionCompactSchema),
  total: z.number().int().nonnegative(),
});

export const commentUpdateResponseSchema = z.object({
  success: z.boolean(),
  comment: commentNodeSchema,
});

export const uploadDeleteResponseSchema = z.object({
  deletedId: z.string(),
  deletedSize: z.number().int(),
});

export const calendarSubscriptionCreateResponseSchema = z.object({
  subscription: calendarSubscriptionSummarySchema,
  token: z.string(),
});

export const currentCalendarSubscriptionResponseSchema = z.union([
  z.object({ subscription: z.null() }),
  z.object({
    subscription: calendarSubscriptionSummarySchema,
    token: z.string(),
  }),
]);

export const openApiDocumentResponseSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    version: z.string(),
  }),
  paths: z.record(z.string(), z.unknown()),
});

export type MatchSectionCodesRequest = z.infer<
  typeof matchSectionCodesRequestSchema
>;

export type HomeworkCreateRequest = z.infer<typeof homeworkCreateRequestSchema>;

export type DescriptionUpsertRequest = z.infer<
  typeof descriptionUpsertRequestSchema
>;
