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

const WebhookPayloadSchema = z.object({
  type: z.enum(["semesters", "sections", "schedules"]),
  data: z.any(),
  semesterId: z.number().optional(),
});

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

    const { type, data, semesterId } = validationResult.data;

    let result: any;

    switch (type) {
      case "semesters": {
        // Validate semesters data
        const semestersValidation = z.array(SemesterSchema).safeParse(data);
        if (!semestersValidation.success) {
          return NextResponse.json(
            {
              error: "Invalid semesters data",
              details: semestersValidation.error.issues,
            },
            { status: 400 },
          );
        }
        const semesters = await loadSemestersFromData(data);
        result = {
          success: true,
          message: `Loaded ${semesters.length} semesters`,
          count: semesters.length,
        };
        break;
      }

      case "sections": {
        if (!semesterId) {
          return NextResponse.json(
            { error: "semesterId is required for sections" },
            { status: 400 },
          );
        }

        // Find the semester
        const semester = await prisma.semester.findUnique({
          where: { id: semesterId },
        });

        if (!semester) {
          return NextResponse.json(
            { error: `Semester with id ${semesterId} not found` },
            { status: 404 },
          );
        }

        // Validate sections data
        const sectionsValidation = z.array(SectionSchema).safeParse(data);
        if (!sectionsValidation.success) {
          return NextResponse.json(
            {
              error: "Invalid sections data",
              details: sectionsValidation.error.issues,
            },
            { status: 400 },
          );
        }

        const count = await loadSectionsFromData(data, semester);
        result = {
          success: true,
          message: `Loaded ${count} sections for semester ${semester.name}`,
          count,
          semesterId: semester.id,
        };
        break;
      }

      case "schedules": {
        if (!semesterId) {
          return NextResponse.json(
            { error: "semesterId is required for schedules" },
            { status: 400 },
          );
        }

        // Find the semester
        const semester = await prisma.semester.findUnique({
          where: { id: semesterId },
        });

        if (!semester) {
          return NextResponse.json(
            { error: `Semester with id ${semesterId} not found` },
            { status: 404 },
          );
        }

        // Data should be a record mapping section jwId to schedule data
        if (typeof data !== "object" || Array.isArray(data)) {
          return NextResponse.json(
            {
              error:
                "Invalid schedules data - must be an object mapping section jwId to schedule data",
            },
            { status: 400 },
          );
        }

        const count = await loadSchedulesFromData(data, semester);
        result = {
          success: true,
          message: `Loaded schedules for ${count} sections in semester ${semester.name}`,
          count,
          semesterId: semester.id,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown data type: ${type}` },
          { status: 400 },
        );
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
