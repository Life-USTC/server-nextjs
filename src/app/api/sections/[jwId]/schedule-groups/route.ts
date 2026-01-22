import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const { jwId } = await context.params;

    const section = await prisma.section.findUnique({
      where: { jwId: parseInt(jwId, 10) },
      include: {
        scheduleGroups: {
          select: { schedules: true },
          orderBy: [{ isDefault: "desc" }, { no: "asc" }],
        },
      },
    });

    return NextResponse.json(section?.scheduleGroups);
  } catch (error) {
    console.error("Error fetching schedule groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule groups" },
      { status: 500 },
    );
  }
}
