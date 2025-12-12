import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      buildings,
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
      prisma.building.findMany({
        orderBy: { nameCn: "asc" },
        include: { campus: true },
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
      buildings,
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 },
    );
  }
}
