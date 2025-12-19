import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const currentSemester = await prisma.semester.findFirst({
      where: {
        AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }],
      },
    });

    if (!currentSemester) {
      return NextResponse.json(
        { error: "No current semester found" },
        { status: 404 },
      );
    }

    return NextResponse.json(currentSemester);
  } catch (error) {
    console.error("Error fetching current semester:", error);
    return NextResponse.json(
      { error: "Failed to fetch current semester" },
      { status: 500 },
    );
  }
}
