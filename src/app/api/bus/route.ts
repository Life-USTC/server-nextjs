import type { NextRequest } from "next/server";
import { getLocale } from "next-intl/server";
import { queryBusSchedules } from "@/features/bus/lib/bus-service";
import {
  handleRouteError,
  invalidParamResponse,
  jsonResponse,
  parseInteger,
} from "@/lib/api/helpers";
import { busQueryResponseSchema } from "@/lib/api/schemas";
import { busQuerySchema } from "@/lib/api/schemas/request-schemas";

export const dynamic = "force-dynamic";

/**
 * Public shuttle-bus query API.
 * @params busQuerySchema
 * @response busQueryResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = busQuerySchema.safeParse({
    now: searchParams.get("now") ?? undefined,
    dayType: searchParams.get("dayType") ?? undefined,
    originCampusId:
      searchParams.get("originCampusId") ??
      searchParams.get("from") ??
      undefined,
    destinationCampusId:
      searchParams.get("destinationCampusId") ??
      searchParams.get("to") ??
      undefined,
    favoriteCampusIds: searchParams.get("favoriteCampusIds") ?? undefined,
    favoriteRouteIds: searchParams.get("favoriteRouteIds") ?? undefined,
    showDepartedTrips: searchParams.get("showDepartedTrips") ?? undefined,
    includeAllTrips: searchParams.get("includeAllTrips") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    versionKey: searchParams.get("versionKey") ?? undefined,
  });

  if (!parsedQuery.success) {
    return handleRouteError("Invalid bus query", parsedQuery.error, 400);
  }

  const locale = await getLocale();
  const originCampusId = parsedQuery.data.originCampusId
    ? parseInteger(parsedQuery.data.originCampusId)
    : null;
  const destinationCampusId = parsedQuery.data.destinationCampusId
    ? parseInteger(parsedQuery.data.destinationCampusId)
    : null;

  if (
    parsedQuery.data.originCampusId !== undefined &&
    parsedQuery.data.originCampusId !== "" &&
    originCampusId == null
  ) {
    return invalidParamResponse("originCampusId");
  }
  if (
    parsedQuery.data.destinationCampusId !== undefined &&
    parsedQuery.data.destinationCampusId !== "" &&
    destinationCampusId == null
  ) {
    return invalidParamResponse("destinationCampusId");
  }

  const favoriteCampusIds = (parsedQuery.data.favoriteCampusIds ?? "")
    .split(",")
    .map((value) => parseInteger(value))
    .filter((value): value is number => value != null);
  const favoriteRouteIds = (parsedQuery.data.favoriteRouteIds ?? "")
    .split(",")
    .map((value) => parseInteger(value))
    .filter((value): value is number => value != null);

  try {
    const result = await queryBusSchedules({
      locale: locale === "en-us" ? "en-us" : "zh-cn",
      now: parsedQuery.data.now,
      dayType: parsedQuery.data.dayType,
      originCampusId,
      destinationCampusId,
      favoriteCampusIds,
      favoriteRouteIds,
      showDepartedTrips:
        parsedQuery.data.showDepartedTrips === "true"
          ? true
          : parsedQuery.data.showDepartedTrips === "false"
            ? false
            : undefined,
      includeAllTrips: parsedQuery.data.includeAllTrips === "true",
      limit: parsedQuery.data.limit
        ? (parseInteger(parsedQuery.data.limit) ?? undefined)
        : undefined,
      versionKey: parsedQuery.data.versionKey ?? null,
    });

    if (!result) {
      return jsonResponse(
        { error: "Bus schedule is not available" },
        { status: 404 },
      );
    }

    const validated = busQueryResponseSchema.parse(result);
    return jsonResponse(validated);
  } catch (error) {
    return handleRouteError("Failed to query shuttle bus schedules", error);
  }
}
