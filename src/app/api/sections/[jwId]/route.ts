import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const { jwId } = await context.params;
    const parsedJwId = parseInt(jwId, 10);

    if (Number.isNaN(parsedJwId)) {
      return NextResponse.json(
        { error: "Invalid section ID" },
        { status: 400 },
      );
    }

    const section = await prisma.section.findUnique({
      where: { jwId: parsedJwId },
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

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    return handleRouteError("Failed to fetch section", error);
  }
}
