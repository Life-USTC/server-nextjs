import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get metadata dictionaries for filters.
 * @response metadataResponseSchema
 */
export async function GET() {
  try {
    const [
      educationLevels,
      courseCategories,
      courseClassifies,
      classTypes,
      courseTypes,
      courseGradations,
      examModes,
      teachLanguages,
      campuses,
    ] = await Promise.all([
      prisma.educationLevel.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.courseCategory.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.courseClassify.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.classType.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.courseType.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.courseGradation.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.examMode.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.teachLanguage.findMany({ orderBy: { nameCn: "asc" } }),
      prisma.campus.findMany({
        orderBy: { nameCn: "asc" },
        include: { buildings: true },
      }),
    ]);

    return NextResponse.json({
      educationLevels,
      courseCategories,
      courseClassifies,
      classTypes,
      courseTypes,
      courseGradations,
      examModes,
      teachLanguages,
      campuses,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch metadata", error);
  }
}
