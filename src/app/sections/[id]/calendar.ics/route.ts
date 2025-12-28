import { type NextRequest, NextResponse } from "next/server";
import { createSectionCalendar } from "@/lib/ical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const section = await prisma.section.findUnique({
      where: { jwId: parseInt(id, 10) },
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
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const calendar = createSectionCalendar(section);
    const icsData = calendar.toString();

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
