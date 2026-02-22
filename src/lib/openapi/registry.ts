import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  descriptionUpsertRequestSchema,
  homeworkCreateRequestSchema,
  matchSectionCodesRequestSchema,
  openApiErrorSchema,
  sectionCodeSchema,
} from "@/lib/api-schemas";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const semesterSummarySchema = z.object({
  id: z.number().int(),
  nameCn: z.string().nullable(),
  code: z.string().nullable(),
});

const matchCodesResponseSchema = z.object({
  semester: semesterSummarySchema,
  matchedCodes: z.array(sectionCodeSchema),
  unmatchedCodes: z.array(sectionCodeSchema),
  sections: z.array(z.record(z.string(), z.unknown())),
  total: z.number().int().nonnegative(),
});

const currentSemesterResponseSchema = z.object({
  id: z.number().int(),
  nameCn: z.string().nullable(),
  nameEn: z.string().nullable(),
  code: z.string().nullable(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
});

const homeworkCreateResponseSchema = z.object({
  id: z.string(),
});

const descriptionUpsertResponseSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
});

const genericSuccessSchema = z.object({}).passthrough();

const registerGenericPath = (
  method: "get" | "post" | "patch" | "delete" | "put",
  path: string,
  summary: string,
  tag: string,
) => {
  registry.registerPath({
    method,
    path,
    summary,
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: genericSuccessSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: openApiErrorSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: openApiErrorSchema,
          },
        },
      },
      403: {
        description: "Forbidden",
        content: {
          "application/json": {
            schema: openApiErrorSchema,
          },
        },
      },
      404: {
        description: "Not found",
        content: {
          "application/json": {
            schema: openApiErrorSchema,
          },
        },
      },
    },
    tags: [tag],
  });
};

registry.registerPath({
  method: "post",
  path: "/api/sections/match-codes",
  summary: "Match section codes in one semester",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: matchSectionCodesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Matched section result",
      content: {
        "application/json": {
          schema: matchCodesResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    404: {
      description: "No semester found",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["Sections"],
});

registry.registerPath({
  method: "get",
  path: "/api/semesters/current",
  summary: "Get current semester",
  responses: {
    200: {
      description: "Current semester",
      content: {
        "application/json": {
          schema: currentSemesterResponseSchema,
        },
      },
    },
    404: {
      description: "No current semester",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["Semesters"],
});

registry.registerPath({
  method: "post",
  path: "/api/homeworks",
  summary: "Create homework for one section",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: homeworkCreateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Homework created",
      content: {
        "application/json": {
          schema: homeworkCreateResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["Homeworks"],
});

registry.registerPath({
  method: "post",
  path: "/api/descriptions",
  summary: "Create or update description for a target",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: descriptionUpsertRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Description upsert result",
      content: {
        "application/json": {
          schema: descriptionUpsertResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["Descriptions"],
});

const genericEndpoints = [
  ["get", "/api/openapi", "Get OpenAPI document", "System"],
  [
    "get",
    "/api/sections/calendar.ics",
    "Export multiple sections calendar",
    "Sections",
  ],
  ["get", "/api/sections", "List sections", "Sections"],
  ["get", "/api/sections/{jwId}", "Get section detail", "Sections"],
  [
    "get",
    "/api/sections/{jwId}/calendar.ics",
    "Export section calendar",
    "Sections",
  ],
  [
    "get",
    "/api/sections/{jwId}/schedule-groups",
    "List section schedule groups",
    "Sections",
  ],
  [
    "get",
    "/api/sections/{jwId}/schedules",
    "List section schedules",
    "Sections",
  ],
  ["get", "/api/courses", "List courses", "Courses"],
  ["get", "/api/teachers", "List teachers", "Teachers"],
  ["get", "/api/schedules", "List schedules", "Schedules"],
  ["get", "/api/semesters", "List semesters", "Semesters"],
  ["get", "/api/comments", "List comments by target", "Comments"],
  ["post", "/api/comments", "Create comment", "Comments"],
  ["get", "/api/comments/{id}", "Get comment thread", "Comments"],
  ["patch", "/api/comments/{id}", "Update comment", "Comments"],
  ["delete", "/api/comments/{id}", "Delete comment", "Comments"],
  ["post", "/api/comments/{id}/reactions", "Add comment reaction", "Comments"],
  [
    "delete",
    "/api/comments/{id}/reactions",
    "Remove comment reaction",
    "Comments",
  ],
  ["get", "/api/homeworks", "List section homeworks", "Homeworks"],
  ["patch", "/api/homeworks/{id}", "Update homework", "Homeworks"],
  ["delete", "/api/homeworks/{id}", "Delete homework", "Homeworks"],
  [
    "put",
    "/api/homeworks/{id}/completion",
    "Update homework completion",
    "Homeworks",
  ],
  ["get", "/api/descriptions", "Get description by target", "Descriptions"],
  ["post", "/api/uploads", "Create upload reservation", "Uploads"],
  ["get", "/api/uploads", "List uploads", "Uploads"],
  ["post", "/api/uploads/complete", "Finalize upload", "Uploads"],
  ["patch", "/api/uploads/{id}", "Rename upload", "Uploads"],
  ["delete", "/api/uploads/{id}", "Delete upload", "Uploads"],
  ["get", "/api/uploads/{id}/download", "Get upload download URL", "Uploads"],
  [
    "post",
    "/api/calendar-subscriptions",
    "Create calendar subscription",
    "Calendar",
  ],
  [
    "get",
    "/api/calendar-subscriptions/current",
    "Get current user subscriptions",
    "Calendar",
  ],
  [
    "get",
    "/api/calendar-subscriptions/{id}",
    "Get subscription detail",
    "Calendar",
  ],
  [
    "patch",
    "/api/calendar-subscriptions/{id}",
    "Update subscription sections",
    "Calendar",
  ],
  [
    "delete",
    "/api/calendar-subscriptions/{id}",
    "Delete subscription",
    "Calendar",
  ],
  [
    "get",
    "/api/calendar-subscriptions/{id}/calendar.ics",
    "Export subscription calendar",
    "Calendar",
  ],
  ["get", "/api/admin/comments", "List moderation comments", "Admin"],
  ["patch", "/api/admin/comments/{id}", "Moderate comment", "Admin"],
  ["get", "/api/admin/users", "List users", "Admin"],
  ["patch", "/api/admin/users/{id}", "Update user", "Admin"],
  ["get", "/api/admin/suspensions", "List suspensions", "Admin"],
  ["post", "/api/admin/suspensions", "Create suspension", "Admin"],
  ["patch", "/api/admin/suspensions/{id}", "Lift suspension", "Admin"],
  ["get", "/api/metadata", "Get metadata summary", "System"],
  ["post", "/api/locale", "Update locale cookie", "System"],
] as const;

for (const [method, path, summary, tag] of genericEndpoints) {
  registerGenericPath(method, path, summary, tag);
}

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Life@USTC API",
      version: "0.1.0",
      description: "Life@USTC Next.js API specification.",
    },
    servers: [{ url: "/" }],
  });
}
