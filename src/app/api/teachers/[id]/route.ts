import type { NextRequest } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  jsonResponse,
  notFound,
  parseInteger,
} from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { teacherDetailInclude } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * Get teacher detail by numeric ID.
 * @pathParams resourceIdPathParamsSchema
 * @response teacherDetailSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = resourceIdPathParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return invalidParamResponse("teacher ID");
    }

    const parsedId = parseInteger(parsedParams.data.id);
    if (parsedId === null) {
      return invalidParamResponse("teacher ID");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: parsedId },
      include: teacherDetailInclude,
    });

    if (!teacher) {
      return notFound("Teacher not found");
    }

    return jsonResponse(teacher);
  } catch (error) {
    return handleRouteError("Failed to fetch teacher", error);
  }
}
