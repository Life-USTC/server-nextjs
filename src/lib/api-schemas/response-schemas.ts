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
} from "@/generated/zod/schemas/variants/pure";

const dateTimeSchema = z.string().datetime();

const pageMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const createPaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: pageMetaSchema,
  });

const createCollectionSchema = <T extends z.ZodTypeAny>(
  key: string,
  itemSchema: T,
) =>
  z.object({
    [key]: z.array(itemSchema),
  });

const campusSchema = CampusModelSchema.omit({
  buildings: true,
  sections: true,
});
const buildingSchema = BuildingModelSchema.omit({ campus: true, rooms: true });
const roomTypeSchema = RoomTypeModelSchema.omit({
  rooms: true,
  sections: true,
});

const roomSchema = RoomModelSchema.omit({
  building: true,
  roomType: true,
  schedules: true,
});

const departmentSchema = DepartmentModelSchema.omit({
  sections: true,
  teachers: true,
});

const teacherTitleSchema = TeacherTitleModelSchema.omit({ teachers: true });
const teacherLessonTypeSchema = TeacherLessonTypeModelSchema.omit({
  teacherAssignments: true,
});

const teacherSchema = TeacherModelSchema.omit({
  department: true,
  teacherTitle: true,
  sections: true,
  sectionTeachers: true,
  teacherAssignments: true,
  schedules: true,
  comments: true,
  description: true,
});

const teacherWithDepartmentSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
});

const teacherWithDepartmentTitleSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
  teacherTitle: teacherTitleSchema.nullable(),
});

const teacherListSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
  teacherTitle: teacherTitleSchema.nullable(),
  _count: z.object({ sections: z.number().int() }),
});

const courseCategorySchema = CourseCategoryModelSchema.omit({ courses: true });
const courseClassifySchema = CourseClassifyModelSchema.omit({ courses: true });
const courseGradationSchema = CourseGradationModelSchema.omit({
  courses: true,
});
const courseTypeSchema = CourseTypeModelSchema.omit({ courses: true });
const classTypeSchema = ClassTypeModelSchema.omit({ courses: true });
const educationLevelSchema = EducationLevelModelSchema.omit({ courses: true });
const examModeSchema = ExamModeModelSchema.omit({ sections: true });
const teachLanguageSchema = TeachLanguageModelSchema.omit({ sections: true });

const courseBaseSchema = CourseModelSchema.omit({
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

const courseSchema = courseBaseSchema.extend({
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

const adminClassSchema = AdminClassModelSchema.omit({ sections: true });

const sectionBaseSchema = SectionModelSchema.omit({
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
});

const sectionCompactSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  openDepartment: departmentSchema.nullable(),
  teachers: z.array(teacherSchema),
});

const sectionListSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  openDepartment: departmentSchema.nullable(),
  examMode: examModeSchema.nullable(),
  teachLanguage: teachLanguageSchema.nullable(),
  teachers: z.array(teacherSchema),
  adminClasses: z.array(adminClassSchema),
});

const buildingWithCampusSchema = buildingSchema.extend({
  campus: campusSchema.nullable(),
});

const roomWithBuildingSchema = roomSchema.extend({
  building: buildingSchema.nullable(),
  roomType: roomTypeSchema.nullable(),
});

const roomWithBuildingCampusSchema = roomSchema.extend({
  building: buildingWithCampusSchema.nullable(),
  roomType: roomTypeSchema.nullable(),
});

const scheduleBaseSchema = ScheduleModelSchema.omit({
  room: true,
  section: true,
  scheduleGroup: true,
  teachers: true,
}).extend({
  date: dateTimeSchema.nullable(),
});

const scheduleGroupSchema = ScheduleGroupModelSchema.omit({
  section: true,
  schedules: true,
});

const scheduleWithRoomTeachersSchema = scheduleBaseSchema.extend({
  room: roomWithBuildingSchema.nullable(),
  teachers: z.array(teacherSchema),
});

const scheduleWithRelationsSchema = scheduleBaseSchema.extend({
  room: roomWithBuildingCampusSchema.nullable(),
  teachers: z.array(teacherWithDepartmentSchema),
  section: sectionBaseSchema.extend({
    course: courseBaseSchema,
  }),
  scheduleGroup: scheduleGroupSchema,
});

const examRoomSchema = ExamRoomModelSchema.omit({ exam: true });
const examBatchSchema = ExamBatchModelSchema.omit({ exams: true });

const examSchema = ExamModelSchema.omit({
  examBatch: true,
  section: true,
  examRooms: true,
}).extend({
  examDate: dateTimeSchema.nullable(),
  examBatch: examBatchSchema.nullable(),
  examRooms: z.array(examRoomSchema),
});

const teacherAssignmentSchema = TeacherAssignmentModelSchema.omit({
  teacher: true,
  section: true,
  teacherLessonType: true,
}).extend({
  weekIndices: z.array(z.number().int()).nullable(),
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

const commentAuthorSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().nullable(),
  image: z.string().nullable().optional(),
  isUstcVerified: z.boolean(),
  isAdmin: z.boolean(),
  isGuest: z.boolean(),
});

const commentAttachmentSummarySchema = z.object({
  id: z.string(),
  uploadId: z.string(),
  filename: z.string(),
  url: z.string(),
  contentType: z.string().nullable(),
  size: z.number().int(),
});

const commentReactionSummarySchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative(),
  viewerHasReacted: z.boolean(),
});

type CommentNode = {
  id: string;
  body: string;
  visibility: string;
  status: string;
  author: z.infer<typeof commentAuthorSummarySchema> | null;
  authorHidden: boolean;
  isAnonymous: boolean;
  isAuthor: boolean;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  rootId: string | null;
  replies: CommentNode[];
  attachments: z.infer<typeof commentAttachmentSummarySchema>[];
  reactions: z.infer<typeof commentReactionSummarySchema>[];
  canReply: boolean;
  canEdit: boolean;
  canModerate: boolean;
};

const commentNodeSchema: z.ZodType<CommentNode> = z.lazy(() =>
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

const viewerContextSchema = z.object({
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

export const commentUpdateResponseSchema = z.object({
  success: z.boolean(),
  comment: commentNodeSchema,
});

const descriptionHistoryEntrySchema = DescriptionEditModelSchema.omit({
  description: true,
  editor: true,
}).extend({
  createdAt: dateTimeSchema,
  editor: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      username: z.string().nullable(),
    })
    .nullable(),
});

const descriptionDetailSchema = DescriptionModelSchema.omit({
  section: true,
  course: true,
  teacher: true,
  homework: true,
  edits: true,
  lastEditedBy: true,
}).extend({
  id: z.string().nullable(),
  updatedAt: dateTimeSchema.nullable(),
  lastEditedAt: dateTimeSchema.nullable(),
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

export const descriptionUpsertResponseSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
});

const homeworkUserSummarySchema = UserModelSchema.pick({
  id: true,
  name: true,
  username: true,
  image: true,
});

const homeworkDescriptionSchema = DescriptionModelSchema.pick({
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
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  lastEditedAt: dateTimeSchema.nullable(),
});

const homeworkListItemSchema = HomeworkModelSchema.omit({
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
  description: homeworkDescriptionSchema.nullable(),
  createdBy: homeworkUserSummarySchema.nullable(),
  updatedBy: homeworkUserSummarySchema.nullable(),
  deletedBy: homeworkUserSummarySchema.nullable(),
  completion: z
    .object({
      completedAt: dateTimeSchema,
    })
    .nullable(),
});

const homeworkAuditLogSchema = HomeworkAuditLogModelSchema.omit({
  section: true,
  homework: true,
  actor: true,
}).extend({
  createdAt: dateTimeSchema,
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

export const uploadRenameResponseSchema = z.object({
  upload: uploadSummarySchema,
});

export const uploadDeleteResponseSchema = z.object({
  deletedId: z.string(),
  deletedSize: z.number().int(),
});

export const paginatedCourseResponseSchema =
  createPaginatedSchema(courseSchema);
export const paginatedSectionResponseSchema =
  createPaginatedSchema(sectionListSchema);
export const paginatedTeacherResponseSchema =
  createPaginatedSchema(teacherListSchema);
export const paginatedScheduleResponseSchema = createPaginatedSchema(
  scheduleWithRelationsSchema,
);
export const paginatedSemesterResponseSchema =
  createPaginatedSchema(semesterSchema);

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

const adminCommentSchema = adminCommentBaseSchema.extend({
  user: z.object({ name: z.string().nullable() }).nullable(),
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

export const adminCommentsResponseSchema = createCollectionSchema(
  "comments",
  adminCommentSchema,
);

export const adminModeratedCommentResponseSchema = z.object({
  comment: adminCommentBaseSchema,
});

const adminSuspensionSchema = UserSuspensionModelSchema.omit({
  user: true,
  createdBy: true,
  liftedBy: true,
}).extend({
  createdAt: dateTimeSchema,
  expiresAt: dateTimeSchema.nullable(),
  liftedAt: dateTimeSchema.nullable(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const adminSuspensionsResponseSchema = createCollectionSchema(
  "suspensions",
  adminSuspensionSchema,
);

export const adminSuspensionResponseSchema = z.object({
  suspension: adminSuspensionSchema,
});

const adminUserListItemSchema = UserModelSchema.pick({
  id: true,
  name: true,
  username: true,
  isAdmin: true,
  createdAt: true,
}).extend({
  email: z.string().nullable(),
  createdAt: dateTimeSchema,
});

export const adminUsersResponseSchema = createPaginatedSchema(
  adminUserListItemSchema,
);

export const adminUserResponseSchema = z.object({
  user: adminUserListItemSchema,
});

export const calendarSubscriptionSummarySchema = z.object({
  id: z.number().int(),
  sections: z.array(z.object({ id: z.number().int() })),
});

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

export const currentCalendarSubscriptionResponseSchema = z.union([
  z.object({ subscription: z.null() }),
  z.object({
    subscription: calendarSubscriptionSummarySchema,
    token: z.string(),
  }),
]);

export const calendarSubscriptionCreateResponseSchema = z.object({
  subscription: calendarSubscriptionSummarySchema,
  token: z.string(),
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

export const openApiDocumentResponseSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string().optional(),
  }),
  servers: z
    .array(
      z.object({
        url: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  paths: z.record(z.string(), z.unknown()),
});

export const openApiErrorSchema = z.object({
  error: z.string(),
});

export const successResponseSchema = z.object({
  success: z.boolean(),
});

export const idResponseSchema = z.object({
  id: z.string(),
});
