import { type NextRequest, NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  parseInteger,
} from "@/lib/api-helpers";
import { jwIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get schedule groups for one section.
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
        scheduleGroups: {
          select: { schedules: true },
          orderBy: [{ isDefault: "desc" }, { no: "asc" }],
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section.scheduleGroups);
  } catch (error) {
    return handleRouteError("Failed to fetch schedule groups", error);
  }
}
