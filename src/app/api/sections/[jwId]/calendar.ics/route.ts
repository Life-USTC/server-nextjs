import { type NextRequest, NextResponse } from "next/server";
import { invalidParamResponse, parseInteger } from "@/lib/api-helpers";
import { jwIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { createSectionCalendar } from "@/lib/ical";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Generate calendar ICS for one section.
 * @pathParams jwIdPathParamsSchema
 * @response 200:binary
 * @response 404:openApiErrorSchema
 */
export async function GET(
  _: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = jwIdPathParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return invalidParamResponse("section JW ID");
    }

    const { jwId } = parsedParams.data;
    const sectionJwId = parseInteger(jwId);

    if (sectionJwId === null) {
      return invalidParamResponse("section JW ID");
    }

    const section = await prisma.section.findUnique({
      where: { jwId: sectionJwId },
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

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const calendar = await createSectionCalendar(section);
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
