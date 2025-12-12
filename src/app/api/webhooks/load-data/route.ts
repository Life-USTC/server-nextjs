import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadSchedulesFromData,
  loadSectionsFromData,
  loadSemestersFromData,
} from "@/lib/data-loader";
import { prisma } from "@/lib/prisma";

// Validation schemas
const SemesterSchema = z.object({
  id: z.number(),
  nameZh: z.string(),
  code: z.string(),
  start: z.string(),
  end: z.string(),
});

const SectionSchema = z.object({
  id: z.number(),
  code: z.string(),
  credits: z.number().optional(),
  period: z.number().optional(),
  periodsPerWeek: z.number().optional(),
  stdCount: z.number().optional(),
  limitCount: z.number().optional(),
  graduateAndPostgraduate: z.boolean().optional(),
  dateTimePlaceText: z.string().optional().nullable(),
  dateTimePlacePersonText: z.string().optional().nullable(),
  course: z.object({
    id: z.number(),
    code: z.string(),
    cn: z.string(),
    en: z.string().optional().nullable(),
  }),
  education: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  courseGradation: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  courseCategory: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  classType: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  courseType: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  courseClassify: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  campus: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  openDepartment: z
    .object({
      code: z.string(),
      cn: z.string(),
      en: z.string().optional().nullable(),
      college: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  examMode: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  teachLang: z
    .object({
      cn: z.string(),
      en: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  teacherAssignmentList: z
    .array(
      z.object({
        cn: z.string(),
        en: z.string().optional().nullable(),
        departmentCode: z.string().optional().nullable(),
      }),
    )
    .optional(),
  adminClasses: z
    .array(
      z.object({
        cn: z.string(),
        en: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

const WebhookPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("semesters"),
    data: z.array(SemesterSchema),
  }),
  z.object({
    type: z.literal("sections"),
    data: z.array(SectionSchema),
    semesterId: z.number(),
  }),
  z.object({
    type: z.literal("schedules"),
    data: z.record(z.string(), z.any()), // Record mapping section jwId to schedule data
    semesterId: z.number(),
  }),
]);

// Authentication helper
function authenticateRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET is not configured");
    return false;
  }

  if (!authHeader) {
    return false;
  }

  // Support both "Bearer <token>" and plain token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return token === webhookSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    if (!authenticateRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing authentication token" },
        { status: 401 },
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = WebhookPayloadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const payload = validationResult.data;
    let result: any;

    switch (payload.type) {
      case "semesters": {
        const semesters = await loadSemestersFromData(payload.data);
        result = {
          success: true,
          message: `Loaded ${semesters.length} semesters`,
          count: semesters.length,
        };
        break;
      }

      case "sections": {
        // Find the semester
        const semester = await prisma.semester.findUnique({
          where: { id: payload.semesterId },
        });

        if (!semester) {
          return NextResponse.json(
            { error: `Semester with id ${payload.semesterId} not found` },
            { status: 404 },
          );
        }

        const count = await loadSectionsFromData(payload.data, semester);
        result = {
          success: true,
          message: `Loaded ${count} sections for semester ${semester.name}`,
          count,
          semesterId: semester.id,
        };
        break;
      }

      case "schedules": {
        // Find the semester
        const semester = await prisma.semester.findUnique({
          where: { id: payload.semesterId },
        });

        if (!semester) {
          return NextResponse.json(
            { error: `Semester with id ${payload.semesterId} not found` },
            { status: 404 },
          );
        }

        const count = await loadSchedulesFromData(payload.data, semester);
        result = {
          success: true,
          message: `Loaded schedules for ${count} sections in semester ${semester.name}`,
          count,
          semesterId: semester.id,
        };
        break;
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
