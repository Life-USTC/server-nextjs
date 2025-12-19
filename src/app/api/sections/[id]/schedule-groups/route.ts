import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const scheduleGroups = await prisma.scheduleGroup.findMany({
      where: { sectionId: parseInt(id, 10) },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { no: "asc" }],
    });

    return NextResponse.json({ data: scheduleGroups });
  } catch (error) {
    console.error("Error fetching schedule groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule groups" },
      { status: 500 },
    );
  }
}
