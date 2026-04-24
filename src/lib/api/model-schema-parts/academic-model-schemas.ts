import { z } from "zod";

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
