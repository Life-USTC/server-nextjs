import { z } from "zod";
import {
  CommentModelSchema,
  DescriptionModelSchema,
  UserModelSchema,
  UserSuspensionModelSchema,
} from "@/lib/api/model-schemas";
import { homeworkUserSummarySchema } from "./homeworks-response-schemas";
import { createCollectionSchema, dateTimeSchema } from "./response-schema-core";

const adminCommentBaseSchema = CommentModelSchema.omit({
  user: true,
  moderatedBy: true,
  parent: true,
  replies: true,
  root: true,
  thread: true,
  section: true,
  course: true,
  teacher: true,
  sectionTeacher: true,
  homework: true,
  attachments: true,
  reactions: true,
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  deletedAt: dateTimeSchema.nullable(),
  moderatedAt: dateTimeSchema.nullable(),
});

const adminCommentSchema = adminCommentBaseSchema.extend({
  user: z.object({ name: z.string().nullable() }).nullable(),
  section: z
    .object({
      jwId: z.number().int(),
      code: z.string(),
      course: z.object({
        jwId: z.number().int(),
        code: z.string(),
        nameCn: z.string(),
      }),
    })
    .nullable(),
  course: z
    .object({
      jwId: z.number().int(),
      code: z.string(),
      nameCn: z.string(),
    })
    .nullable(),
  teacher: z.object({ id: z.number().int(), nameCn: z.string() }).nullable(),
  homework: z
    .object({
      id: z.string(),
      title: z.string(),
      section: z.object({ code: z.string() }),
    })
    .nullable(),
  sectionTeacher: z
    .object({
      section: z.object({
        jwId: z.number().int(),
        code: z.string(),
        course: z.object({
          jwId: z.number().int(),
          code: z.string(),
          nameCn: z.string(),
        }),
      }),
      teacher: z.object({ nameCn: z.string() }),
    })
    .nullable(),
});

export const adminCommentsResponseSchema = createCollectionSchema(
  "comments",
  adminCommentSchema,
);

export const adminModeratedCommentResponseSchema = z.object({
  comment: adminCommentBaseSchema,
});

const adminDescriptionSchema = DescriptionModelSchema.omit({
  section: true,
  course: true,
  teacher: true,
  homework: true,
  edits: true,
  lastEditedBy: true,
}).extend({
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  lastEditedAt: dateTimeSchema.nullable(),
  lastEditedBy: homeworkUserSummarySchema.nullable(),
  section: z
    .object({
      jwId: z.number().int().nullable(),
      code: z.string().nullable(),
      course: z
        .object({
          jwId: z.number().int(),
          code: z.string(),
          nameCn: z.string(),
        })
        .nullable(),
    })
    .nullable(),
  course: z
    .object({ jwId: z.number().int(), code: z.string(), nameCn: z.string() })
    .nullable(),
  teacher: z.object({ id: z.number().int(), nameCn: z.string() }).nullable(),
  homework: z
    .object({
      id: z.string(),
      title: z.string(),
      section: z
        .object({
          jwId: z.number().int().nullable(),
          code: z.string().nullable(),
          course: z
            .object({
              jwId: z.number().int(),
              code: z.string(),
              nameCn: z.string(),
            })
            .nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

export const adminDescriptionsResponseSchema = createCollectionSchema(
  "descriptions",
  adminDescriptionSchema,
);

const adminSuspensionSchema = UserSuspensionModelSchema.omit({
  user: true,
  createdBy: true,
  liftedBy: true,
}).extend({
  createdAt: dateTimeSchema,
  expiresAt: dateTimeSchema.nullable(),
  liftedAt: dateTimeSchema.nullable(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const adminSuspensionsResponseSchema = createCollectionSchema(
  "suspensions",
  adminSuspensionSchema,
);

export const adminSuspensionResponseSchema = z.object({
  suspension: adminSuspensionSchema,
});

const adminUserListItemSchema = UserModelSchema.pick({
  id: true,
  name: true,
  username: true,
  isAdmin: true,
  createdAt: true,
}).extend({
  email: z.string().nullable(),
  createdAt: dateTimeSchema,
});

export const adminUsersResponseSchema = z.object({
  data: z.array(adminUserListItemSchema),
  pagination: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const adminUserResponseSchema = z.object({
  user: adminUserListItemSchema,
});
