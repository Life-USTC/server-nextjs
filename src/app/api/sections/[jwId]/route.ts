import type { NextRequest } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  jsonResponse,
  notFound,
  parseInteger,
} from "@/lib/api/helpers";
import { jwIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { findSectionDetailByJwId } from "@/lib/course-section-queries";

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

    const section = await findSectionDetailByJwId(parsedJwId, "zh-cn");

    if (!section) {
      return notFound("Section not found");
    }

    return jsonResponse(section);
  } catch (error) {
    return handleRouteError("Failed to fetch section", error);
  }
}
