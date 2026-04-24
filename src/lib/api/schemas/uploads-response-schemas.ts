import { z } from "zod";
import { UploadModelSchema } from "@/lib/api/model-schemas";
import { dateTimeSchema } from "./response-schema-core";

const uploadSummarySchema = UploadModelSchema.pick({
  id: true,
  key: true,
  filename: true,
  size: true,
  createdAt: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const uploadsListResponseSchema = z.object({
  maxFileSizeBytes: z.number().int(),
  quotaBytes: z.number().int(),
  uploads: z.array(uploadSummarySchema),
  usedBytes: z.number().int(),
});

export const uploadCreateResponseSchema = z.object({
  key: z.string(),
  url: z.string(),
  maxFileSizeBytes: z.number().int(),
  quotaBytes: z.number().int(),
  usedBytes: z.number().int(),
});

export const uploadCompleteResponseSchema = z.object({
  upload: uploadSummarySchema,
  usedBytes: z.number().int(),
  quotaBytes: z.number().int(),
});

export const uploadRenameResponseSchema = z.object({
  upload: uploadSummarySchema,
});

export const uploadDeleteResponseSchema = z.object({
  deletedId: z.string(),
  deletedSize: z.number().int(),
});
