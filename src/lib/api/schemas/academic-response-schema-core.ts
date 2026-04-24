import { z } from "zod";
import {
  AdminClassModelSchema,
  BuildingModelSchema,
  BusCampusModelSchema,
  CampusModelSchema,
  ClassTypeModelSchema,
  CourseCategoryModelSchema,
  CourseClassifyModelSchema,
  CourseGradationModelSchema,
  CourseModelSchema,
  CourseTypeModelSchema,
  DepartmentModelSchema,
  EducationLevelModelSchema,
  ExamBatchModelSchema,
  ExamModelSchema,
  ExamModeModelSchema,
  ExamRoomModelSchema,
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
} from "@/lib/api/model-schemas";
import {
  createPaginatedSchema,
  dateTimeSchema,
} from "./response-schema-primitives";

const localizedNameFields = {
  namePrimary: z.string(),
  nameSecondary: z.string().nullable(),
};

const campusSchema = CampusModelSchema.omit({
  buildings: true,
  sections: true,
});

export const busCampusSchema = BusCampusModelSchema.omit({
  routeStops: true,
  preferredByOriginUsers: true,
  preferredByDestinationUsers: true,
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
  subscribedUsers: true,
  comments: true,
  description: true,
  homeworks: true,
  homeworkAuditLogs: true,
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
  schedules: z.array(
    ScheduleModelSchema.omit({
      room: true,
      section: true,
      scheduleGroup: true,
      teachers: true,
    }).extend({
      date: dateTimeSchema.nullable(),
    }),
  ),
  scheduleGroups: z.array(
    ScheduleGroupModelSchema.omit({
      section: true,
      schedules: true,
    }),
  ),
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

export {
  buildingSchema,
  campusSchema,
  roomSchema,
  roomTypeSchema,
  teacherSchema,
};
