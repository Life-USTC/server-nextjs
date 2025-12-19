import { type NextRequest, NextResponse } from "next/server";
import { createSectionCalendar } from "@/lib/ical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const scheduleGroupId = searchParams.get("scheduleGroup");

    // Fetch section with all necessary relations
    const section = await prisma.section.findUnique({
      where: { id: parseInt(id, 10) },
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
                roomType: true,
              },
            },
            teacher: {
              include: {
                department: true,
              },
            },
            scheduleGroup: true,
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Create calendar
    const calendar = createSectionCalendar(
      section,
      scheduleGroupId ? parseInt(scheduleGroupId, 10) : undefined,
    );

    const icsData = calendar.toString();

    // Return as .ics file
    return new NextResponse(icsData, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="life-ustc-${section.semesterId}-${section.code}.ics"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating section calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to generate calendar",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
