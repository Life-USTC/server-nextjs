import type { NextRequest } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  jsonResponse,
  notFound,
  parseInteger,
} from "@/lib/api/helpers";
import { jwIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { getPrisma } from "@/lib/db/prisma";
import { courseDetailInclude } from "@/lib/query-helpers";

export const dynamic = "force-dynamic";

/**
 * Get course detail by JW ID.
 * @pathParams jwIdPathParamsSchema
 * @response courseDetailSchema
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
      return invalidParamResponse("course ID");
    }

    const parsedJwId = parseInteger(parsedParams.data.jwId);
    if (parsedJwId === null) {
      return invalidParamResponse("course ID");
    }

    const course = await getPrisma("zh-cn").course.findUnique({
      where: { jwId: parsedJwId },
      include: courseDetailInclude,
    });

    if (!course) {
      return notFound("Course not found");
    }

    return jsonResponse(course);
  } catch (error) {
    return handleRouteError("Failed to fetch course", error);
  }
}
