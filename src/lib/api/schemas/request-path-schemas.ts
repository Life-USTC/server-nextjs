import * as z from "zod";
import { integerStringSchema } from "./request-schema-primitives";

export const resourceIdPathParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const jwIdPathParamsSchema = z.object({
  jwId: integerStringSchema,
});

export const userCalendarPathParamsSchema = z.object({
  userId: z.string().trim().min(1),
});
