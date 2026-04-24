import { z } from "zod";
import { CommentStatusSchema, CommentVisibilitySchema } from "./shared-enums";

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
