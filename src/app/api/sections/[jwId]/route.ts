import { type NextRequest, NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  notFound,
  parseInteger,
} from "@/lib/api-helpers";
import { jwIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";
import { sectionInclude } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * Get section detail by JW ID.
 * @pathParams jwIdPathParamsSchema
 * @response sectionDetailSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = jwIdPathParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return invalidParamResponse("section ID");
    }

    const { jwId } = parsedParams.data;
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
      return notFound("Section not found");
    }

    return NextResponse.json(section);
  } catch (error) {
    return handleRouteError("Failed to fetch section", error);
  }
}
