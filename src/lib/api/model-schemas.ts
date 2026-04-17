import { z } from "zod";

// Derived from the project's previous prisma-zod-generator output.
// Keep this module updated when Prisma models that feed API schemas change.

export const CommentVisibilitySchema = z.enum([
  "public",
  "logged_in_only",
  "anonymous",
]);

export type CommentVisibility = z.infer<typeof CommentVisibilitySchema>;

export const CommentStatusSchema = z.enum(["active", "softbanned", "deleted"]);

export type CommentStatus = z.infer<typeof CommentStatusSchema>;

export const HomeworkAuditActionSchema = z.enum(["created", "deleted"]);

export type HomeworkAuditAction = z.infer<typeof HomeworkAuditActionSchema>;

// prettier-ignore
export const AdminClassModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int().nullable(),
    code: z.string().nullable(),
    grade: z.string().nullable(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    stdCount: z.number().int().nullable(),
    planCount: z.number().int().nullable(),
    enabled: z.boolean().nullable(),
    abbrZh: z.string().nullable(),
    abbrEn: z.string().nullable(),
    sections: z.array(z.unknown()),
  })
  .strict();

export type AdminClassPureType = z.infer<typeof AdminClassModelSchema>;

// prettier-ignore
export const BuildingModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string(),
    campusId: z.number().int().nullable(),
    campus: z.unknown().nullable(),
    rooms: z.array(z.unknown()),
  })
  .strict();

export type BuildingPureType = z.infer<typeof BuildingModelSchema>;

// prettier-ignore
export const CampusModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int().nullable(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string().nullable(),
    buildings: z.array(z.unknown()),
    sections: z.array(z.unknown()),
  })
  .strict();

export type CampusPureType = z.infer<typeof CampusModelSchema>;

// prettier-ignore
export const ClassTypeModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type ClassTypePureType = z.infer<typeof ClassTypeModelSchema>;

// prettier-ignore
export const CommentModelSchema = z
  .object({
    id: z.string(),
    body: z.string(),
    visibility: CommentVisibilitySchema,
    status: CommentStatusSchema,
    isAnonymous: z.boolean(),
    authorName: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
    moderatedAt: z.date().nullable(),
    moderationNote: z.string().nullable(),
    userId: z.string().nullable(),
    user: z.unknown().nullable(),
    moderatedById: z.string().nullable(),
    moderatedBy: z.unknown().nullable(),
    parentId: z.string().nullable(),
    parent: z.unknown().nullable(),
    replies: z.array(z.unknown()),
    rootId: z.string().nullable(),
    root: z.unknown().nullable(),
    thread: z.array(z.unknown()),
    sectionId: z.number().int().nullable(),
    courseId: z.number().int().nullable(),
    teacherId: z.number().int().nullable(),
    sectionTeacherId: z.number().int().nullable(),
    homeworkId: z.string().nullable(),
    section: z.unknown().nullable(),
    course: z.unknown().nullable(),
    teacher: z.unknown().nullable(),
    sectionTeacher: z.unknown().nullable(),
    homework: z.unknown().nullable(),
    attachments: z.array(z.unknown()),
    reactions: z.array(z.unknown()),
  })
  .strict();

export type CommentPureType = z.infer<typeof CommentModelSchema>;

// prettier-ignore
export const CourseCategoryModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type CourseCategoryPureType = z.infer<typeof CourseCategoryModelSchema>;

// prettier-ignore
export const CourseClassifyModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type CourseClassifyPureType = z.infer<typeof CourseClassifyModelSchema>;

// prettier-ignore
export const CourseGradationModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type CourseGradationPureType = z.infer<
  typeof CourseGradationModelSchema
>;

// prettier-ignore
export const CourseModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    code: z.string(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    categoryId: z.number().int().nullable(),
    classTypeId: z.number().int().nullable(),
    classifyId: z.number().int().nullable(),
    educationLevelId: z.number().int().nullable(),
    gradationId: z.number().int().nullable(),
    typeId: z.number().int().nullable(),
    category: z.unknown().nullable(),
    classType: z.unknown().nullable(),
    classify: z.unknown().nullable(),
    educationLevel: z.unknown().nullable(),
    gradation: z.unknown().nullable(),
    type: z.unknown().nullable(),
    sections: z.array(z.unknown()),
    comments: z.array(z.unknown()),
    description: z.unknown().nullable(),
  })
  .strict();

export type CoursePureType = z.infer<typeof CourseModelSchema>;

// prettier-ignore
export const CourseTypeModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type CourseTypePureType = z.infer<typeof CourseTypeModelSchema>;

// prettier-ignore
export const DepartmentModelSchema = z
  .object({
    id: z.number().int(),
    code: z.string(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    isCollege: z.boolean().nullable(),
    sections: z.array(z.unknown()),
    teachers: z.array(z.unknown()),
  })
  .strict();

export type DepartmentPureType = z.infer<typeof DepartmentModelSchema>;

// prettier-ignore
export const DescriptionEditModelSchema = z
  .object({
    id: z.string(),
    descriptionId: z.string(),
    description: z.unknown(),
    editorId: z.string().nullable(),
    editor: z.unknown().nullable(),
    previousContent: z.string().nullable(),
    nextContent: z.string(),
    createdAt: z.date(),
  })
  .strict();

export type DescriptionEditPureType = z.infer<
  typeof DescriptionEditModelSchema
>;

// prettier-ignore
export const DescriptionModelSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    lastEditedAt: z.date().nullable(),
    lastEditedById: z.string().nullable(),
    lastEditedBy: z.unknown().nullable(),
    sectionId: z.number().int().nullable(),
    courseId: z.number().int().nullable(),
    teacherId: z.number().int().nullable(),
    homeworkId: z.string().nullable(),
    section: z.unknown().nullable(),
    course: z.unknown().nullable(),
    teacher: z.unknown().nullable(),
    homework: z.unknown().nullable(),
    edits: z.array(z.unknown()),
  })
  .strict();

export type DescriptionPureType = z.infer<typeof DescriptionModelSchema>;

// prettier-ignore
export const EducationLevelModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    courses: z.array(z.unknown()),
  })
  .strict();

export type EducationLevelPureType = z.infer<typeof EducationLevelModelSchema>;

// prettier-ignore
export const ExamBatchModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    exams: z.array(z.unknown()),
  })
  .strict();

export type ExamBatchPureType = z.infer<typeof ExamBatchModelSchema>;

// prettier-ignore
export const ExamModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    examType: z.number().int().nullable(),
    startTime: z.number().int().nullable(),
    endTime: z.number().int().nullable(),
    examDate: z.date().nullable(),
    examTakeCount: z.number().int().nullable(),
    examMode: z.string().nullable(),
    examBatchId: z.number().int().nullable(),
    sectionId: z.number().int(),
    examBatch: z.unknown().nullable(),
    section: z.unknown(),
    examRooms: z.array(z.unknown()),
  })
  .strict();

export type ExamPureType = z.infer<typeof ExamModelSchema>;

// prettier-ignore
export const ExamModeModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    sections: z.array(z.unknown()),
  })
  .strict();

export type ExamModePureType = z.infer<typeof ExamModeModelSchema>;

// prettier-ignore
export const ExamRoomModelSchema = z
  .object({
    id: z.number().int(),
    room: z.string(),
    count: z.number().int(),
    examId: z.number().int(),
    exam: z.unknown(),
  })
  .strict();

export type ExamRoomPureType = z.infer<typeof ExamRoomModelSchema>;

// prettier-ignore
export const HomeworkAuditLogModelSchema = z
  .object({
    id: z.string(),
    action: HomeworkAuditActionSchema,
    titleSnapshot: z.string(),
    createdAt: z.date(),
    sectionId: z.number().int(),
    section: z.unknown(),
    homeworkId: z.string().nullable(),
    homework: z.unknown().nullable(),
    actorId: z.string().nullable(),
    actor: z.unknown().nullable(),
  })
  .strict();

export type HomeworkAuditLogPureType = z.infer<
  typeof HomeworkAuditLogModelSchema
>;

// prettier-ignore
export const HomeworkCompletionModelSchema = z
  .object({
    userId: z.string(),
    homeworkId: z.string(),
    completedAt: z.date(),
    user: z.unknown(),
    homework: z.unknown(),
  })
  .strict();

export type HomeworkCompletionPureType = z.infer<
  typeof HomeworkCompletionModelSchema
>;

// prettier-ignore
export const HomeworkModelSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    isMajor: z.boolean(),
    requiresTeam: z.boolean(),
    publishedAt: z.date().nullable(),
    submissionStartAt: z.date().nullable(),
    submissionDueAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
    sectionId: z.number().int(),
    section: z.unknown(),
    createdById: z.string().nullable(),
    createdBy: z.unknown().nullable(),
    updatedById: z.string().nullable(),
    updatedBy: z.unknown().nullable(),
    deletedById: z.string().nullable(),
    deletedBy: z.unknown().nullable(),
    description: z.unknown().nullable(),
    comments: z.array(z.unknown()),
    auditLogs: z.array(z.unknown()),
    homeworkCompletions: z.array(z.unknown()),
  })
  .strict();

export type HomeworkPureType = z.infer<typeof HomeworkModelSchema>;

// prettier-ignore
export const RoomModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string(),
    floor: z.number().int().nullable(),
    virtual: z.boolean(),
    seatsForSection: z.number().int(),
    remark: z.string().nullable(),
    seats: z.number().int(),
    buildingId: z.number().int().nullable(),
    roomTypeId: z.number().int().nullable(),
    building: z.unknown().nullable(),
    roomType: z.unknown().nullable(),
    schedules: z.array(z.unknown()),
  })
  .strict();

export type RoomPureType = z.infer<typeof RoomModelSchema>;

// prettier-ignore
export const RoomTypeModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string(),
    rooms: z.array(z.unknown()),
    sections: z.array(z.unknown()),
  })
  .strict();

export type RoomTypePureType = z.infer<typeof RoomTypeModelSchema>;

// prettier-ignore
export const ScheduleGroupModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    no: z.number().int(),
    limitCount: z.number().int(),
    stdCount: z.number().int(),
    actualPeriods: z.number().int(),
    isDefault: z.boolean(),
    sectionId: z.number().int(),
    section: z.unknown(),
    schedules: z.array(z.unknown()),
  })
  .strict();

export type ScheduleGroupPureType = z.infer<typeof ScheduleGroupModelSchema>;

// prettier-ignore
export const ScheduleModelSchema = z
  .object({
    id: z.number().int(),
    periods: z.number().int(),
    date: z.date().nullable(),
    weekday: z.number().int(),
    startTime: z.string(),
    endTime: z.string(),
    experiment: z.string().nullable(),
    customPlace: z.string().nullable(),
    lessonType: z.string().nullable(),
    weekIndex: z.number().int(),
    exerciseClass: z.boolean().nullable(),
    startUnit: z.number().int(),
    endUnit: z.number().int(),
    roomId: z.number().int().nullable(),
    sectionId: z.number().int(),
    scheduleGroupId: z.number().int(),
    room: z.unknown().nullable(),
    section: z.unknown(),
    scheduleGroup: z.unknown(),
    teachers: z.array(z.unknown()),
  })
  .strict();

export type SchedulePureType = z.infer<typeof ScheduleModelSchema>;

// prettier-ignore
export const SectionModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    code: z.string(),
    bizTypeId: z.number().int().nullable(),
    credits: z.number().nullable(),
    period: z.number().int().nullable(),
    periodsPerWeek: z.number().int().nullable(),
    timesPerWeek: z.number().int().nullable(),
    stdCount: z.number().int().nullable(),
    limitCount: z.number().int().nullable(),
    graduateAndPostgraduate: z.boolean().nullable(),
    dateTimePlaceText: z.string().nullable(),
    dateTimePlacePersonText: z.unknown().nullable(),
    actualPeriods: z.number().int().nullable(),
    theoryPeriods: z.number().nullable(),
    practicePeriods: z.number().nullable(),
    experimentPeriods: z.number().nullable(),
    machinePeriods: z.number().nullable(),
    designPeriods: z.number().nullable(),
    testPeriods: z.number().nullable(),
    scheduleState: z.string().nullable(),
    suggestScheduleWeeks: z.unknown().nullable(),
    suggestScheduleWeekInfo: z.string().nullable(),
    scheduleJsonParams: z.unknown().nullable(),
    selectedStdCount: z.number().int().nullable(),
    remark: z.string().nullable(),
    scheduleRemark: z.string().nullable(),
    courseId: z.number().int(),
    semesterId: z.number().int().nullable(),
    campusId: z.number().int().nullable(),
    examModeId: z.number().int().nullable(),
    openDepartmentId: z.number().int().nullable(),
    teachLanguageId: z.number().int().nullable(),
    roomTypeId: z.number().int().nullable(),
    course: z.unknown(),
    semester: z.unknown().nullable(),
    campus: z.unknown().nullable(),
    examMode: z.unknown().nullable(),
    openDepartment: z.unknown().nullable(),
    teachLanguage: z.unknown().nullable(),
    roomType: z.unknown().nullable(),
    schedules: z.array(z.unknown()),
    scheduleGroups: z.array(z.unknown()),
    adminClasses: z.array(z.unknown()),
    teachers: z.array(z.unknown()),
    sectionTeachers: z.array(z.unknown()),
    teacherAssignments: z.array(z.unknown()),
    exams: z.array(z.unknown()),
    subscribedUsers: z.array(z.unknown()),
    comments: z.array(z.unknown()),
    description: z.unknown().nullable(),
    homeworks: z.array(z.unknown()),
    homeworkAuditLogs: z.array(z.unknown()),
  })
  .strict();

export type SectionPureType = z.infer<typeof SectionModelSchema>;

// prettier-ignore
export const SemesterModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    code: z.string(),
    startDate: z.date().nullable(),
    endDate: z.date().nullable(),
    sections: z.array(z.unknown()),
  })
  .strict();

export type SemesterPureType = z.infer<typeof SemesterModelSchema>;

// prettier-ignore
export const TeacherAssignmentModelSchema = z
  .object({
    id: z.number().int(),
    teacherId: z.number().int(),
    sectionId: z.number().int(),
    role: z.string().nullable(),
    period: z.number().int().nullable(),
    weekIndices: z.unknown().nullable(),
    weekIndicesMsg: z.string().nullable(),
    teacherLessonTypeId: z.number().int().nullable(),
    teacher: z.unknown(),
    section: z.unknown(),
    teacherLessonType: z.unknown().nullable(),
  })
  .strict();

export type TeacherAssignmentPureType = z.infer<
  typeof TeacherAssignmentModelSchema
>;

// prettier-ignore
export const TeacherLessonTypeModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string(),
    role: z.string().nullable(),
    enabled: z.boolean().nullable(),
    teacherAssignments: z.array(z.unknown()),
  })
  .strict();

export type TeacherLessonTypePureType = z.infer<
  typeof TeacherLessonTypeModelSchema
>;

// prettier-ignore
export const TeacherModelSchema = z
  .object({
    id: z.number().int(),
    personId: z.number().int().nullable(),
    teacherId: z.number().int().nullable(),
    code: z.string().nullable(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    age: z.number().int().nullable(),
    email: z.string().nullable(),
    telephone: z.string().nullable(),
    mobile: z.string().nullable(),
    address: z.string().nullable(),
    postcode: z.string().nullable(),
    qq: z.string().nullable(),
    wechat: z.string().nullable(),
    departmentId: z.number().int().nullable(),
    teacherTitleId: z.number().int().nullable(),
    department: z.unknown().nullable(),
    teacherTitle: z.unknown().nullable(),
    sections: z.array(z.unknown()),
    sectionTeachers: z.array(z.unknown()),
    teacherAssignments: z.array(z.unknown()),
    schedules: z.array(z.unknown()),
    comments: z.array(z.unknown()),
    description: z.unknown().nullable(),
  })
  .strict();

export type TeacherPureType = z.infer<typeof TeacherModelSchema>;

// prettier-ignore
export const TeacherTitleModelSchema = z
  .object({
    id: z.number().int(),
    jwId: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    code: z.string(),
    enabled: z.boolean().nullable(),
    teachers: z.array(z.unknown()),
  })
  .strict();

export type TeacherTitlePureType = z.infer<typeof TeacherTitleModelSchema>;

// prettier-ignore
export const TeachLanguageModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    sections: z.array(z.unknown()),
  })
  .strict();

export type TeachLanguagePureType = z.infer<typeof TeachLanguageModelSchema>;

// prettier-ignore
export const UploadModelSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    filename: z.string(),
    contentType: z.string().nullable(),
    size: z.number().int(),
    createdAt: z.date(),
    updatedAt: z.date(),
    userId: z.string(),
    user: z.unknown(),
    commentAttachments: z.array(z.unknown()),
  })
  .strict();

export type UploadPureType = z.infer<typeof UploadModelSchema>;

// prettier-ignore
export const UserModelSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    image: z.string().nullable(),
    profilePictures: z.array(z.string()),
    isAdmin: z.boolean(),
    calendarFeedToken: z.string().nullable(),
    accounts: z.array(z.unknown()),
    sessions: z.array(z.unknown()),
    Authenticator: z.array(z.unknown()),
    verifiedEmails: z.array(z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date(),
    subscribedSections: z.array(z.unknown()),
    uploads: z.array(z.unknown()),
    uploadPendings: z.array(z.unknown()),
    comments: z.array(z.unknown()),
    moderatedComments: z.array(z.unknown()),
    commentReactions: z.array(z.unknown()),
    suspensions: z.array(z.unknown()),
    suspensionsIssued: z.array(z.unknown()),
    suspensionsLifted: z.array(z.unknown()),
    descriptionEdits: z.array(z.unknown()),
    descriptionLastEdits: z.array(z.unknown()),
    homeworksCreated: z.array(z.unknown()),
    homeworksUpdated: z.array(z.unknown()),
    homeworksDeleted: z.array(z.unknown()),
    homeworkAuditLogs: z.array(z.unknown()),
    homeworkCompletions: z.array(z.unknown()),
    dashboardLinkClicks: z.array(z.unknown()),
    dashboardLinkPins: z.array(z.unknown()),
    todos: z.array(z.unknown()),
    oauthCodes: z.array(z.unknown()),
    oauthAccessTokens: z.array(z.unknown()),
    oauthRefreshTokens: z.array(z.unknown()),
  })
  .strict();

export type UserPureType = z.infer<typeof UserModelSchema>;

// prettier-ignore
export const UserSuspensionModelSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    createdById: z.string(),
    createdAt: z.date(),
    reason: z.string().nullable(),
    note: z.string().nullable(),
    expiresAt: z.date().nullable(),
    liftedAt: z.date().nullable(),
    liftedById: z.string().nullable(),
    user: z.unknown(),
    createdBy: z.unknown(),
    liftedBy: z.unknown().nullable(),
  })
  .strict();

export type UserSuspensionPureType = z.infer<typeof UserSuspensionModelSchema>;

// prettier-ignore
export const BusCampusModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    routeStops: z.array(z.unknown()),
    preferredByOriginUsers: z.array(z.unknown()),
    preferredByDestinationUsers: z.array(z.unknown()),
  })
  .strict();

export type BusCampusPureType = z.infer<typeof BusCampusModelSchema>;

// prettier-ignore
export const BusRouteModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    stops: z.array(z.unknown()),
    trips: z.array(z.unknown()),
  })
  .strict();

export type BusRoutePureType = z.infer<typeof BusRouteModelSchema>;

// prettier-ignore
export const BusRouteStopModelSchema = z
  .object({
    id: z.number().int(),
    routeId: z.number().int(),
    campusId: z.number().int(),
    stopOrder: z.number().int(),
    route: z.unknown(),
    campus: z.unknown(),
  })
  .strict();

export type BusRouteStopPureType = z.infer<typeof BusRouteStopModelSchema>;

// prettier-ignore
export const BusScheduleVersionModelSchema = z
  .object({
    id: z.number().int(),
    key: z.string(),
    title: z.string(),
    checksum: z.string(),
    sourceMessage: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    rawJson: z.unknown(),
    effectiveFrom: z.date().nullable(),
    effectiveUntil: z.date().nullable(),
    isEnabled: z.boolean(),
    importedAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
    trips: z.array(z.unknown()),
  })
  .strict();

export type BusScheduleVersionPureType = z.infer<
  typeof BusScheduleVersionModelSchema
>;

// prettier-ignore
export const BusTripModelSchema = z
  .object({
    id: z.number().int(),
    versionId: z.number().int(),
    routeId: z.number().int(),
    dayType: z.enum(["weekday", "weekend"]),
    position: z.number().int(),
    stopTimes: z.unknown(),
    version: z.unknown(),
    route: z.unknown(),
  })
  .strict();

export type BusTripPureType = z.infer<typeof BusTripModelSchema>;

// prettier-ignore
export const BusUserPreferenceModelSchema = z
  .object({
    userId: z.string(),
    preferredOriginCampusId: z.number().int().nullable(),
    preferredDestinationCampusId: z.number().int().nullable(),
    favoriteCampusIds: z.array(z.number().int()),
    favoriteRouteIds: z.array(z.number().int()),
    showDepartedTrips: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    user: z.unknown(),
    preferredOriginCampus: z.unknown().nullable(),
    preferredDestinationCampus: z.unknown().nullable(),
  })
  .strict();

export type BusUserPreferencePureType = z.infer<
  typeof BusUserPreferenceModelSchema
>;
