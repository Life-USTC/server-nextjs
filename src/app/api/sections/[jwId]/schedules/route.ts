import { type NextRequest, NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  notFound,
  parseInteger,
} from "@/lib/api-helpers";
import { jwIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get all schedules for one section.
 * @pathParams jwIdPathParamsSchema
 * @response 200:array
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
        schedules: {
          include: {
            room: {
              include: {
                building: {
                  include: {
                    campus: true,
                  },
                },
                roomType: true,
              },
            },
            teachers: {
              include: {
                department: true,
              },
            },
            scheduleGroup: true,
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!section) {
      return notFound("Section not found");
    }

    return NextResponse.json(section.schedules);
  } catch (error) {
    return handleRouteError("Failed to fetch section schedules", error);
  }
}
