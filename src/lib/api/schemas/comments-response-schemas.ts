import { z } from "zod";
import { dateTimeSchema, viewerContextSchema } from "./response-schema-core";

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
