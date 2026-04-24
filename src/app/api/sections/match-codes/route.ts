import type { NextRequest } from "next/server";
import {
  handleRouteError,
  jsonResponse,
  parseInteger,
} from "@/lib/api/helpers";
import { matchSectionCodesRequestSchema } from "@/lib/api/schemas/request-schemas";
import { findSectionCodeMatches } from "@/lib/course-section-queries";

export const dynamic = "force-dynamic";

/**
 * Match section codes in one semester.
 * @body matchSectionCodesRequestSchema
 * @response matchSectionCodesResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = matchSectionCodesRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError(
        "Invalid match-codes payload",
        parsedBody.error,
        400,
      );
    }

    const { codes, semesterId } = parsedBody.data;

    const parsedSemesterId = semesterId
      ? parseInteger(String(semesterId))
      : null;

    if (semesterId && parsedSemesterId === null) {
      return handleRouteError(
        "semesterId must be a valid number",
        new Error("Invalid semesterId"),
        400,
      );
    }

    const matches = await findSectionCodeMatches(
      codes,
      "zh-cn",
      parsedSemesterId ?? undefined,
    );

    if (!matches) {
      return handleRouteError(
        "No semester found",
        new Error("No semester"),
        404,
      );
    }

    return jsonResponse({
      semester: matches.semester,
      matchedCodes: matches.matchedCodes,
      unmatchedCodes: matches.unmatchedCodes,
      sections: matches.sections,
      total: matches.total,
    });
  } catch (error) {
    return handleRouteError("Failed to match section codes", error);
  }
}
