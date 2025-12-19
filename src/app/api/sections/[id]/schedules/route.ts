import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const schedules = await prisma.schedule.findMany({
      where: { sectionId: parseInt(id, 10) },
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
    });

    return NextResponse.json({ data: schedules });
  } catch (error) {
    console.error("Error fetching section schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch section schedules" },
      { status: 500 },
    );
  }
}
