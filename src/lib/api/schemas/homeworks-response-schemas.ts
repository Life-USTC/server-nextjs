import { z } from "zod";
import {
  DescriptionModelSchema,
  HomeworkAuditLogModelSchema,
  HomeworkModelSchema,
  UserModelSchema,
} from "@/lib/api/model-schemas";
import {
  dateTimeSchema,
  localizedCourseBaseSchema,
  sectionBaseSchema,
  semesterSchema,
  viewerContextSchema,
} from "./response-schema-core";

export const homeworkUserSummarySchema = UserModelSchema.pick({
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
  section: sectionBaseSchema.extend({
    course: localizedCourseBaseSchema,
    semester: semesterSchema.nullable(),
  }),
  description: homeworkDescriptionSchema.nullable(),
  createdBy: homeworkUserSummarySchema.nullable(),
  updatedBy: homeworkUserSummarySchema.nullable(),
  deletedBy: homeworkUserSummarySchema.nullable(),
  completion: z
    .object({
      completedAt: dateTimeSchema,
    })
    .nullable(),
  commentCount: z.number().int().nonnegative(),
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

export const subscribedHomeworksResponseSchema = z.object({
  viewer: viewerContextSchema,
  homeworks: z.array(homeworkListItemSchema),
  auditLogs: z.array(homeworkAuditLogSchema),
  sectionIds: z.array(z.number().int()),
});
