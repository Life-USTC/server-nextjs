import { type NextRequest, NextResponse } from "next/server";
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
      return NextResponse.json(
        { error: "sectionIds parameter is required" },
        { status: 400 },
      );
    }

    // Parse section IDs from comma-separated string
    const sectionIds = sectionIdsParam
      .split(",")
      .map((id) => Number.parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id));

    if (sectionIds.length === 0) {
      return NextResponse.json(
        { error: "No valid section IDs provided" },
        { status: 400 },
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
            teacher: true,
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
      return NextResponse.json({ error: "No sections found" }, { status: 404 });
    }

    // Create calendar from all sections
    const calendar = createMultiSectionCalendar(sections);
    const icsData = calendar.toString();

    return new NextResponse(icsData, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="life-ustc-schedule.ics"',
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating multi-section calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to generate calendar",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
