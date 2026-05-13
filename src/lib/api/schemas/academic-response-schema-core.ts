import * as z from "zod";
import {
  createPaginatedSchema,
  dateTimeSchema,
} from "./response-schema-primitives";

const localizedNameFields = {
  namePrimary: z.string(),
  nameSecondary: z.string().nullable(),
};

export const campusSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int().nullable(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  code: z.string().nullable(),
});

export const busCampusSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

export const buildingSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  code: z.string(),
  campusId: z.number().int().nullable(),
});

export const roomTypeSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  code: z.string(),
});

export const roomSchema = z.object({
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
});

const departmentSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  isCollege: z.boolean().nullable(),
});

const teacherTitleSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  code: z.string(),
  enabled: z.boolean().nullable(),
});

const teacherLessonTypeSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
  code: z.string(),
  role: z.string().nullable(),
  enabled: z.boolean().nullable(),
});

export const teacherSchema = z.object({
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
});

const teacherWithDepartmentTitleSchema = teacherSchema.extend({
  department: departmentSchema.nullable(),
  teacherTitle: teacherTitleSchema.nullable(),
});

const teacherListSchema = teacherWithDepartmentTitleSchema.extend({
  _count: z.object({ sections: z.number().int() }),
});

const courseCategorySchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const courseClassifySchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const courseGradationSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const courseTypeSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const classTypeSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const educationLevelSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const examModeSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const teachLanguageSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const courseBaseSchema = z.object({
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
});

const courseSchema = courseBaseSchema.extend({
  category: courseCategorySchema.nullable(),
  classType: classTypeSchema.nullable(),
  classify: courseClassifySchema.nullable(),
  educationLevel: educationLevelSchema.nullable(),
  gradation: courseGradationSchema.nullable(),
  type: courseTypeSchema.nullable(),
});

export const semesterSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  nameCn: z.string(),
  code: z.string(),
  startDate: dateTimeSchema.nullable(),
  endDate: dateTimeSchema.nullable(),
});

const adminClassSchema = z.object({
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
});

export const sectionBaseSchema = z.object({
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
});

export const sectionCompactSchema = sectionBaseSchema.extend({
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

export const courseDetailSectionSchema = sectionBaseSchema.extend({
  semester: semesterSchema.nullable(),
  campus: campusSchema.nullable(),
  teachers: z.array(teacherSchema),
});

export const courseDetailSchema = courseSchema.extend({
  sections: z.array(courseDetailSectionSchema),
});

export const teacherDetailSectionSchema = sectionBaseSchema.extend({
  course: courseSchema,
  semester: semesterSchema.nullable(),
});

export const teacherDetailSchema = teacherWithDepartmentTitleSchema.extend({
  sections: z.array(teacherDetailSectionSchema),
  _count: z.object({ sections: z.number().int() }),
});

export const localizedCourseBaseSchema =
  courseBaseSchema.extend(localizedNameFields);

const examRoomSchema = z.object({
  id: z.number().int(),
  room: z.string(),
  count: z.number().int(),
  examId: z.number().int(),
});

const examBatchSchema = z.object({
  id: z.number().int(),
  nameCn: z.string(),
  nameEn: z.string().nullable(),
});

const examSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  examType: z.number().int().nullable(),
  startTime: z.number().int().nullable(),
  endTime: z.number().int().nullable(),
  examDate: dateTimeSchema.nullable(),
  examTakeCount: z.number().int().nullable(),
  examMode: z.string().nullable(),
  examBatchId: z.number().int().nullable(),
  sectionId: z.number().int(),
  examBatch: examBatchSchema.nullable(),
  examRooms: z.array(examRoomSchema),
});

const teacherAssignmentBaseSchema = z.object({
  id: z.number().int(),
  teacherId: z.number().int(),
  sectionId: z.number().int(),
  role: z.string().nullable(),
  period: z.number().int().nullable(),
  weekIndices: z.array(z.number().int()).nullable(),
  weekIndicesMsg: z.string().nullable(),
  teacherLessonTypeId: z.number().int().nullable(),
});

const teacherAssignmentSchema = teacherAssignmentBaseSchema.extend({
  teacher: teacherSchema,
  teacherLessonType: teacherLessonTypeSchema.nullable(),
});

export const scheduleBaseSchema = z.object({
  id: z.number().int(),
  periods: z.number().int(),
  date: dateTimeSchema.nullable(),
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
});

export const scheduleGroupSchema = z.object({
  id: z.number().int(),
  jwId: z.number().int(),
  no: z.number().int(),
  limitCount: z.number().int(),
  stdCount: z.number().int(),
  actualPeriods: z.number().int(),
  isDefault: z.boolean(),
  sectionId: z.number().int(),
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

export const paginatedCourseResponseSchema =
  createPaginatedSchema(courseSchema);
export const paginatedSectionResponseSchema =
  createPaginatedSchema(sectionListSchema);
export const paginatedTeacherResponseSchema =
  createPaginatedSchema(teacherListSchema);
export const paginatedSemesterResponseSchema =
  createPaginatedSchema(semesterSchema);
