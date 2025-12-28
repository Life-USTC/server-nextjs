import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const section = await prisma.section.findUnique({
      where: { jwId: parseInt(id, 10) },
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
            teacher: {
              include: {
                department: true,
              },
            },
            scheduleGroup: true,
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
        scheduleGroups: {
          orderBy: [{ isDefault: "desc" }, { no: "asc" }],
        },
      },
    });

    return NextResponse.json(section?.schedules);
  } catch (error) {
    console.error("Error fetching section schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch section schedules" },
      { status: 500 },
    );
  }
}
