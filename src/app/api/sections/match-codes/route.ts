import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/sections/match-codes
 * Matches section codes against sections in the selected semester
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes, semesterId } = body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return handleRouteError(
        "codes must be a non-empty array",
        new Error("Invalid codes"),
        400,
      );
    }

    const parsedSemesterId = semesterId
      ? Number.parseInt(String(semesterId), 10)
      : null;

    if (parsedSemesterId !== null && Number.isNaN(parsedSemesterId)) {
      return handleRouteError(
        "semesterId must be a valid number",
        new Error("Invalid semesterId"),
        400,
      );
    }

    const now = new Date();
    const currentSemester = parsedSemesterId
      ? await prisma.semester.findUnique({
          where: {
            id: parsedSemesterId,
          },
        })
      : await prisma.semester.findFirst({
          where: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        });

    if (!currentSemester) {
      return handleRouteError(
        "No semester found",
        new Error("No semester"),
        404,
      );
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
    return handleRouteError("Failed to match section codes", error);
  }
}
