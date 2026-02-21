import { type NextRequest, NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  parseInteger,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { sectionInclude } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const { jwId } = await context.params;
    const parsedJwId = parseInteger(jwId);

    if (parsedJwId === null) {
      return invalidParamResponse("section ID");
    }

    const section = await prisma.section.findUnique({
      where: { jwId: parsedJwId },
      include: {
        ...sectionInclude,
        roomType: true,
        schedules: true,
        scheduleGroups: true,
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
