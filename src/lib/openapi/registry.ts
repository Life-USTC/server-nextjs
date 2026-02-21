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
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    403: {
      description: "Suspended",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    404: {
      description: "Section not found",
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
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    403: {
      description: "Suspended",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
    404: {
      description: "Target not found",
      content: {
        "application/json": {
          schema: openApiErrorSchema,
        },
      },
    },
  },
  tags: ["Descriptions"],
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Life@USTC API",
      version: "0.1.0",
      description:
        "Life@USTC Next.js API specification (incremental coverage).",
    },
    servers: [{ url: "/" }],
  });
}
