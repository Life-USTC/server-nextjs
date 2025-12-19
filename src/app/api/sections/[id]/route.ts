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
      where: { id: parseInt(id, 10) },
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
        examMode: true,
        teachLanguage: true,
        teachers: {
          include: {
            department: true,
          },
        },
        adminClasses: true,
        scheduleGroups: true,
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error fetching section:", error);
    return NextResponse.json(
      { error: "Failed to fetch section" },
      { status: 500 },
    );
  }
}
