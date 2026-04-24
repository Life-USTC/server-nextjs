import { z } from "zod";
import {
  DescriptionEditModelSchema,
  DescriptionModelSchema,
} from "@/lib/api/model-schemas";
import { dateTimeSchema, viewerContextSchema } from "./response-schema-core";

const descriptionBaseSchema = DescriptionModelSchema.omit({
  lastEditedBy: true,
  section: true,
  course: true,
  teacher: true,
  homework: true,
  edits: true,
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  lastEditedAt: dateTimeSchema.nullable(),
});

const descriptionEditBaseSchema = DescriptionEditModelSchema.omit({
  description: true,
  editor: true,
}).extend({
  createdAt: dateTimeSchema,
});

export const descriptionHistoryEntrySchema = descriptionEditBaseSchema
  .pick({
    id: true,
    createdAt: true,
    previousContent: true,
    nextContent: true,
  })
  .extend({
    editor: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  });

export const descriptionDetailSchema = descriptionBaseSchema
  .pick({ id: true, content: true, updatedAt: true, lastEditedAt: true })
  .extend({
    id: z.string().nullable(),
    lastEditedBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        username: z.string().nullable(),
      })
      .nullable(),
  });

export const descriptionsResponseSchema = z.object({
  description: descriptionDetailSchema,
  history: z.array(descriptionHistoryEntrySchema),
  viewer: viewerContextSchema,
});

export const descriptionUpsertResponseSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
});
