import type { NextRequest } from "next/server";
import { getLocale } from "next-intl/server";
import { getBusTimetableData } from "@/features/bus/lib/bus-service";
import {
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteInput,
} from "@/lib/api/helpers";
import { busQueryResponseSchema } from "@/lib/api/schemas";
import { busQuerySchema } from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * Public shuttle-bus query API.
 * @params busQuerySchema
 * @response busQueryResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = parseRouteInput(
    {
      versionKey: searchParams.get("versionKey") ?? undefined,
    },
    busQuerySchema,
    "Invalid bus query",
    { logErrors: true },
  );

  if (parsedQuery instanceof Response) {
    return parsedQuery;
  }

  const locale = await getLocale();
  const userId = await resolveApiUserId(request);

  try {
    const result = await getBusTimetableData({
      locale: locale === "en-us" ? "en-us" : "zh-cn",
      versionKey: parsedQuery.versionKey ?? null,
      userId,
    });

    if (!result) {
      return notFound("Bus schedule is not available");
    }

    const validated = busQueryResponseSchema.parse(result);
    return jsonResponse(validated);
  } catch (error) {
    return handleRouteError("Failed to query shuttle bus schedules", error);
  }
}
