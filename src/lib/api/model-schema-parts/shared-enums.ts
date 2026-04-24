import { z } from "zod";

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
