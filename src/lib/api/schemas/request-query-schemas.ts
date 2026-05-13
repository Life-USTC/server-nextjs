import * as z from "zod";
import {
  commentTargetTypeSchema,
  descriptionTargetTypeSchema,
  integerStringSchema,
  todoPrioritySchema,
} from "./request-schema-primitives";

export const sectionsQuerySchema = z.object({
  courseId: integerStringSchema.optional(),
  courseJwId: integerStringSchema.optional(),
  semesterId: integerStringSchema.optional(),
  semesterJwId: integerStringSchema.optional(),
  campusId: integerStringSchema.optional(),
  departmentId: integerStringSchema.optional(),
  teacherId: integerStringSchema.optional(),
  teacherCode: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  ids: z.string().trim().optional(),
  jwIds: z.string().trim().optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const schedulesQuerySchema = z.object({
  sectionId: integerStringSchema.optional(),
  sectionJwId: integerStringSchema.optional(),
  sectionCode: z.string().trim().min(1).optional(),
  teacherId: integerStringSchema.optional(),
  teacherCode: z.string().trim().min(1).optional(),
  roomId: integerStringSchema.optional(),
  roomJwId: integerStringSchema.optional(),
  weekday: integerStringSchema.optional(),
  dateFrom: z.string().trim().datetime().optional(),
  dateTo: z.string().trim().datetime().optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const teachersQuerySchema = z.object({
  departmentId: integerStringSchema.optional(),
  search: z.string().trim().optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const coursesQuerySchema = z.object({
  search: z.string().trim().optional(),
  educationLevelId: integerStringSchema.optional(),
  categoryId: integerStringSchema.optional(),
  classTypeId: integerStringSchema.optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const busQuerySchema = z.object({
  versionKey: z.string().trim().min(1).optional(),
});

export const busPreferenceRequestSchema = z.object({
  preferredOriginCampusId: z.number().int().positive().nullable().default(null),
  preferredDestinationCampusId: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  showDepartedTrips: z.boolean(),
});

export const adminUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const adminCommentsQuerySchema = z.object({
  status: z.enum(["active", "softbanned", "deleted", "suspended"]).optional(),
  limit: integerStringSchema.optional(),
});

export const adminHomeworksQuerySchema = z.object({
  status: z.enum(["all", "active", "deleted"]).optional(),
  search: z.string().trim().optional(),
  limit: integerStringSchema.optional(),
});

export const adminDescriptionsQuerySchema = z.object({
  targetType: z
    .enum(["all", "section", "course", "teacher", "homework"])
    .optional(),
  hasContent: z.enum(["all", "withContent", "empty"]).optional(),
  search: z.string().trim().optional(),
  limit: integerStringSchema.optional(),
});

export const commentsQuerySchema = z.object({
  targetType: commentTargetTypeSchema,
  targetId: z.string().optional(),
  sectionId: integerStringSchema.optional(),
  teacherId: integerStringSchema.optional(),
});

export const descriptionsQuerySchema = z.object({
  targetType: descriptionTargetTypeSchema,
  targetId: z.string().trim().min(1),
});

export const homeworksQuerySchema = z.object({
  sectionId: integerStringSchema.optional(),
  sectionIds: z.string().trim().min(1).optional(),
  includeDeleted: z.enum(["true", "false"]).optional(),
});

export const sectionsCalendarQuerySchema = z.object({
  sectionIds: z.string().trim().min(1),
});

export const dashboardLinkVisitQuerySchema = z.object({
  slug: z.string().trim().min(1),
});

export const semestersQuerySchema = z.object({
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const todosQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional(),
  priority: todoPrioritySchema.optional(),
  dueBefore: z.string().trim().datetime().optional(),
  dueAfter: z.string().trim().datetime().optional(),
});
