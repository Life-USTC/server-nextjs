import { z } from "zod";
import { APP_LOCALES } from "@/i18n/config";
import { CommentVisibilitySchema } from "../model-schemas";

const parseOptionalIntLike = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

const parseOptionalInt = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || !/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const commentReactionTypeSchema = z.enum([
  "upvote",
  "downvote",
  "heart",
  "laugh",
  "hooray",
  "confused",
  "rocket",
  "eyes",
]);

export const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);

export const matchSectionCodesRequestSchema = z.object({
  codes: z.array(sectionCodeSchema).min(1).max(500),
  semesterId: z
    .preprocess(parseOptionalIntLike, z.union([z.string(), z.number()]))
    .optional(),
});

export const homeworkCreateRequestSchema = z.object({
  sectionId: z.union([z.string(), z.number()]),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  publishedAt: z.union([z.string(), z.null()]).optional(),
  submissionStartAt: z.union([z.string(), z.null()]).optional(),
  submissionDueAt: z.union([z.string(), z.null()]).optional(),
  isMajor: z.boolean().optional(),
  requiresTeam: z.boolean().optional(),
});

export const descriptionTargetTypeSchema = z.enum([
  "section",
  "course",
  "teacher",
  "homework",
]);

export const descriptionUpsertRequestSchema = z
  .object({
    targetType: descriptionTargetTypeSchema,
    targetId: z.union([z.string(), z.number()]),
    content: z.string().max(4000),
  })
  .superRefine((input, ctx) => {
    if (input.targetType === "homework") {
      if (
        typeof input.targetId !== "string" ||
        input.targetId.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Homework targetId must be a non-empty string",
          path: ["targetId"],
        });
      }
      return;
    }

    const parsed = parseOptionalInt(input.targetId);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetId must be a valid integer for numeric targets",
        path: ["targetId"],
      });
    }
  });

export const uploadCreateRequestSchema = z.object({
  filename: z.string().trim().min(1),
  contentType: z.string().optional(),
  size: z.union([z.string(), z.number()]),
});

export const uploadCompleteRequestSchema = z.object({
  key: z.string().trim().min(1),
  filename: z.string().trim().min(1),
  contentType: z.string().optional(),
});

export const uploadRenameRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
});

export const calendarSubscriptionCreateRequestSchema = z.object({
  sectionIds: z.array(z.number().int().positive()).optional(),
});

export const commentVisibilitySchema = CommentVisibilitySchema;

export const commentTargetTypeSchema = z.enum([
  "section",
  "course",
  "teacher",
  "section-teacher",
  "homework",
]);

export const commentCreateRequestSchema = z.object({
  targetType: commentTargetTypeSchema,
  targetId: z.union([z.string(), z.number()]).optional(),
  sectionId: z.union([z.string(), z.number()]).optional(),
  teacherId: z.union([z.string(), z.number()]).optional(),
  body: z.string().trim().min(1).max(8000),
  visibility: commentVisibilitySchema.optional(),
  isAnonymous: z.boolean().optional(),
  parentId: z.string().optional().nullable(),
  attachmentIds: z.array(z.string()).optional(),
});

export const commentUpdateRequestSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  visibility: commentVisibilitySchema.optional(),
  isAnonymous: z.boolean().optional(),
  attachmentIds: z.array(z.string()).optional(),
});

export const commentReactionRequestSchema = z.object({
  type: commentReactionTypeSchema,
});

export const adminModerateCommentRequestSchema = z.object({
  status: z.enum(["active", "softbanned", "deleted"]),
  moderationNote: z.string().optional().nullable(),
});

export const homeworkCompletionRequestSchema = z.object({
  completed: z.boolean(),
});

export const homeworkUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  publishedAt: z.union([z.string(), z.null()]).optional(),
  submissionStartAt: z.union([z.string(), z.null()]).optional(),
  submissionDueAt: z.union([z.string(), z.null()]).optional(),
  isMajor: z.boolean().optional(),
  requiresTeam: z.boolean().optional(),
});

export const adminCreateSuspensionRequestSchema = z.object({
  userId: z.string().trim().min(1),
  reason: z.string().optional(),
  note: z.string().optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
});

export const adminUpdateUserRequestSchema = z.object({
  name: z.union([z.string(), z.null()]).optional(),
  username: z.union([z.string(), z.null()]).optional(),
  isAdmin: z.boolean().optional(),
});

export const localeUpdateRequestSchema = z.object({
  // Inline enum so OpenAPI generation embeds values (must match APP_LOCALES)
  locale: z.enum(APP_LOCALES),
});

const integerStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+$/);

export const sectionsQuerySchema = z.object({
  courseId: integerStringSchema.optional(),
  semesterId: integerStringSchema.optional(),
  campusId: integerStringSchema.optional(),
  departmentId: integerStringSchema.optional(),
  teacherId: integerStringSchema.optional(),
  search: z.string().trim().optional(),
  ids: z.string().trim().optional(),
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const schedulesQuerySchema = z.object({
  sectionId: integerStringSchema.optional(),
  teacherId: integerStringSchema.optional(),
  roomId: integerStringSchema.optional(),
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

export const dashboardLinkVisitRequestSchema = z.object({
  slug: z.string().trim().min(1),
});

export type MatchSectionCodesRequest = z.infer<
  typeof matchSectionCodesRequestSchema
>;

export type HomeworkCreateRequest = z.infer<typeof homeworkCreateRequestSchema>;

export type DescriptionUpsertRequest = z.infer<
  typeof descriptionUpsertRequestSchema
>;

export const dashboardLinkPinRequestSchema = z.object({
  slug: z.string().trim().min(1),
  returnTo: z.string().trim().optional(),
  action: z.enum(["pin", "unpin"]).optional(),
});

export const resourceIdPathParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const jwIdPathParamsSchema = z.object({
  jwId: integerStringSchema,
});

export const userCalendarPathParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const semestersQuerySchema = z.object({
  page: integerStringSchema.optional(),
  limit: integerStringSchema.optional(),
});

export const todoPrioritySchema = z.enum(["low", "medium", "high"]);

export const todosQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional(),
  priority: todoPrioritySchema.optional(),
  dueBefore: z.string().trim().datetime().optional(),
  dueAfter: z.string().trim().datetime().optional(),
});

export const todoCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(4000).optional().nullable(),
  priority: todoPrioritySchema.optional(),
  dueAt: z.union([z.string(), z.null()]).optional(),
});

export const todoUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(4000).optional().nullable(),
  priority: todoPrioritySchema.optional(),
  dueAt: z.union([z.string(), z.null()]).optional(),
  completed: z.boolean().optional(),
});
