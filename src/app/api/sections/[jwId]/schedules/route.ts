import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const { jwId } = await context.params;
    const parsedJwId = parseInt(jwId, 10);

    if (Number.isNaN(parsedJwId)) {
      return NextResponse.json(
        { error: "Invalid section ID" },
        { status: 400 },
      );
    }

    const section = await prisma.section.findUnique({
      where: { jwId: parsedJwId },
      include: {
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
            teachers: {
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

    return NextResponse.json(section.schedules);
  } catch (error) {
    return handleRouteError("Failed to fetch section schedules", error);
  }
}
