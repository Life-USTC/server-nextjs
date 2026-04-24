import { z } from "zod";
import { HomeworkAuditActionSchema } from "./shared-enums";

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
