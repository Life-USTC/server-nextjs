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
      where: { jwId: parseInt(id, 10) },
      include: {
        course: {
          include: {
            category: true,
            classType: true,
            classify: true,
            educationLevel: true,
            gradation: true,
            type: true,
          },
        },
        semester: true,
        campus: true,
        examMode: true,
        openDepartment: true,
        teachLanguage: true,
        roomType: true,
        schedules: true,
        scheduleGroups: true,
        adminClasses: true,
        teachers: {
          include: {
            department: true,
            teacherTitle: true,
          },
        },
        teacherAssignments: {
          include: {
            teacher: true,
            teacherLessonType: true,
          },
        },
        exams: {
          include: {
            examBatch: true,
            examRooms: true,
          },
        },
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error fetching section:", error);
    return NextResponse.json(
      { error: "Failed to fetch section" },
      { status: 500 },
    );
  }
}
