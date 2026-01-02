import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/sections/match-codes
 * Matches section codes against sections in the current semester
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes } = body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "codes must be a non-empty array" },
        { status: 400 },
      );
    }

    // Get current semester based on today's date
    const now = new Date();
    const currentSemester = await prisma.semester.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!currentSemester) {
      return NextResponse.json({ error: "No semester found" }, { status: 404 });
    }

    // Find matching sections in current semester
    const matchingSections = await prisma.section.findMany({
      where: {
        code: {
          in: codes,
        },
        semesterId: currentSemester.id,
      },
      include: {
        course: {
          include: {
            educationLevel: true,
            category: true,
            classify: true,
            classType: true,
            gradation: true,
            type: true,
          },
        },
        semester: true,
        campus: true,
        openDepartment: true,
        teachers: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    return NextResponse.json({
      semester: {
        id: currentSemester.id,
        nameCn: currentSemester.nameCn,
        code: currentSemester.code,
      },
      matchedCodes: matchingSections.map((s) => s.code),
      unmatchedCodes: codes.filter(
        (code) => !matchingSections.some((s) => s.code === code),
      ),
      sections: matchingSections,
      total: matchingSections.length,
    });
  } catch (error) {
    console.error("Error matching section codes:", error);
    return NextResponse.json(
      { error: "Failed to match section codes" },
      { status: 500 },
    );
  }
}
