import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError, parseIntegerList } from "@/lib/api-helpers";
import { createMultiSectionCalendar } from "@/lib/ical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/sections/calendar.ics?sectionIds=1,2,3
 * Generate calendar for multiple sections
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionIdsParam = searchParams.get("sectionIds");

    if (!sectionIdsParam) {
      return handleRouteError(
        "sectionIds parameter is required",
        new Error("Missing sectionIds"),
        400,
      );
    }

    // Parse section IDs from comma-separated string
    const sectionIds = parseIntegerList(sectionIdsParam);

    if (sectionIds.length === 0) {
      return handleRouteError(
        "No valid section IDs provided",
        new Error("Invalid section IDs"),
        400,
      );
    }

    // Fetch all sections with their schedules and exams
    const sections = await prisma.section.findMany({
      where: {
        id: {
          in: sectionIds,
        },
      },
      include: {
        course: true,
        schedules: {
          include: {
            room: {
              include: {
                building: {
                  include: {
                    campus: true,
                  },
                },
              },
            },
            teachers: true,
          },
        },
        exams: {
          include: {
            examRooms: true,
          },
        },
      },
    });

    if (sections.length === 0) {
      return handleRouteError(
        "No sections found",
        new Error("No sections"),
        404,
      );
    }

    // Create calendar from all sections
    const calendar = await createMultiSectionCalendar(sections);
    const icsData = calendar.toString();

    return new NextResponse(icsData, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="life-ustc-schedule.ics"',
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    return handleRouteError("Failed to generate calendar", error);
  }
}
