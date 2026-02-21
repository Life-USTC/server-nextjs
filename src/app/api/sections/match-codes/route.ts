import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError, parseInteger } from "@/lib/api-helpers";
import { matchSectionCodesRequestSchema } from "@/lib/api-schemas";
import { findCurrentSemester } from "@/lib/current-semester";
import { prisma } from "@/lib/prisma";
import { sectionCompactInclude } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/sections/match-codes
 * Matches section codes against sections in the selected semester
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = matchSectionCodesRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError(
        "Invalid match-codes payload",
        parsedBody.error,
        400,
      );
    }

    const { codes, semesterId } = parsedBody.data;

    const parsedSemesterId = semesterId
      ? parseInteger(String(semesterId))
      : null;

    if (semesterId && parsedSemesterId === null) {
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
      : await findCurrentSemester(prisma.semester, now);

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
      include: sectionCompactInclude,
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
