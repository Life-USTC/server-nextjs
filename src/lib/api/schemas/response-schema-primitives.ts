import { z } from "zod";

export const dateTimeSchema = z.string().datetime({ offset: true });

const pageMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const createPaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: pageMetaSchema,
  });

export const createCollectionSchema = <T extends z.ZodTypeAny>(
  key: string,
  itemSchema: T,
) =>
  z.object({
    [key]: z.array(itemSchema),
  });
