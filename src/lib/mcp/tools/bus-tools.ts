import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildNextBusDeparturesFromData,
  getBusRouteTimetable,
  getBusTimetableData,
  getNextBusDepartures,
  listBusRoutes,
  searchBusRoutes,
} from "@/features/bus/lib/bus-service";
import {
  flexDateInputSchema,
  getUserId,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";
import { summarizeBusDeparture } from "@/lib/mcp/tools/event-summary";

const busDayTypeSchema = z.enum(["auto", "weekday", "weekend"]).default("auto");

function summarizeBusTimetable(
  result: NonNullable<Awaited<ReturnType<typeof getBusTimetableData>>>,
) {
  const weekdayTrips = result.trips.filter(
    (trip) => trip.dayType === "weekday",
  );
  const weekendTrips = result.trips.filter(
    (trip) => trip.dayType === "weekend",
  );
  const nextDepartures =
    result.preferences?.preferredOriginCampusId != null &&
    result.preferences?.preferredDestinationCampusId != null
      ? buildNextBusDeparturesFromData(result, {
          originCampusId: result.preferences.preferredOriginCampusId,
          destinationCampusId: result.preferences.preferredDestinationCampusId,
          atTime: result.fetchedAt,
          includeDeparted: result.preferences.showDepartedTrips,
          limit: 3,
        }).departures
      : [];
  const nextDeparturesMessage =
    result.preferences?.preferredOriginCampusId == null ||
    result.preferences?.preferredDestinationCampusId == null
      ? "Save preferred origin and destination campuses or call get_next_buses for a specific route query."
      : nextDepartures.length === 0
        ? "No immediate departures are available for the saved campus preference."
        : null;

  return {
    locale: result.locale,
    fetchedAt: result.fetchedAt,
    version: result.version
      ? {
          key: result.version.key,
          title: result.version.title,
          effectiveFrom: result.version.effectiveFrom,
          effectiveUntil: result.version.effectiveUntil,
        }
      : null,
    counts: {
      campuses: result.campuses.length,
      routes: result.routes.length,
      weekdayTrips: weekdayTrips.length,
      weekendTrips: weekendTrips.length,
    },
    campuses: result.campuses.map((campus) => ({
      id: campus.id,
      namePrimary: campus.namePrimary,
      nameSecondary: campus.nameSecondary,
    })),
    routes: result.routes.slice(0, 10).map((route) => ({
      id: route.id,
      nameCn: route.nameCn,
      nameEn: route.nameEn,
      descriptionPrimary: route.descriptionPrimary,
      descriptionSecondary: route.descriptionSecondary,
    })),
    preferences: result.preferences,
    nextDepartures,
    nextDeparturesMessage,
    notice: result.notice?.message ? { message: result.notice.message } : null,
  };
}

function summarizeBusTimetableBrief(
  result: NonNullable<Awaited<ReturnType<typeof getBusTimetableData>>>,
) {
  const compact = summarizeBusTimetable(result);
  return {
    locale: compact.locale,
    fetchedAt: compact.fetchedAt,
    version: compact.version,
    counts: compact.counts,
    preferences: compact.preferences,
    nextDepartures: compact.nextDepartures,
    nextDeparturesMessage: compact.nextDeparturesMessage,
    notice: compact.notice,
  };
}

function omitRepeatedCampusesFromDepartures<
  T extends {
    originCampus?: unknown;
    destinationCampus?: unknown;
  },
>(departures: T[]) {
  return departures.map(
    ({
      originCampus: _originCampus,
      destinationCampus: _destinationCampus,
      ...departure
    }) => departure,
  );
}

export function registerBusTools(server: McpServer) {
  server.registerTool(
    "query_bus_timetable",
    {
      description:
        "Full USTC shuttle bus dataset for clients that need local filtering. Prefer get_next_buses for departures or list_bus_routes for discovery.",
      inputSchema: {
        versionKey: z.string().trim().min(1).optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ versionKey, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const result = await getBusTimetableData({
        locale,
        versionKey,
        userId: getUserId(extra.authInfo),
      });

      if (result && resolvedMode === "summary") {
        return jsonToolResult(summarizeBusTimetableBrief(result), {
          mode: "default",
        });
      }

      if (result && resolvedMode === "default") {
        return jsonToolResult(summarizeBusTimetable(result), {
          mode: "default",
        });
      }

      return jsonToolResult(
        result ?? {
          locale,
          hasData: false,
          message: "No bus schedule data available",
        },
        {
          mode: resolvedMode,
        },
      );
    },
  );

  server.registerTool(
    "list_bus_routes",
    {
      description:
        "Route and campus discovery for the active shuttle timetable. Use returned route IDs with get_bus_route_timetable.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
      },
    },
    async ({ locale }) => {
      const result = await listBusRoutes(locale);
      return jsonToolResult(result, { mode: "default" });
    },
  );

  server.registerTool(
    "get_bus_route_timetable",
    {
      description:
        "Full weekday/weekend timetable for one route ID. Use list_bus_routes first to find route IDs.",
      inputSchema: {
        routeId: z.number().int().positive(),
        versionKey: z.string().trim().min(1).optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ routeId, versionKey, locale, mode }) => {
      const result = await getBusRouteTimetable({
        routeId,
        locale,
        versionKey,
      });

      if (!result) {
        return jsonToolResult({
          routeId,
          hasData: false,
          message: `No timetable found for route ${routeId}. Use list_bus_routes to see available route IDs.`,
        });
      }

      return jsonToolResult(result, { mode: resolveMcpMode(mode) });
    },
  );

  server.registerTool(
    "search_bus_routes",
    {
      description:
        "Find shuttle routes by optional origin/destination campus IDs. Use get_next_buses when the user asks when to leave.",
      inputSchema: {
        originCampusId: z.number().int().positive().optional(),
        destinationCampusId: z.number().int().positive().optional(),
        versionKey: z.string().trim().min(1).optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({
      originCampusId,
      destinationCampusId,
      versionKey,
      locale,
      mode,
    }) => {
      const result = await searchBusRoutes({
        locale,
        originCampusId,
        destinationCampusId,
        versionKey,
      });

      return jsonToolResult(
        result ?? {
          hasData: false,
          message: "No bus schedule data available",
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "get_next_buses",
    {
      description:
        "Next shuttle departures between two campuses. Best tool for 'when is the next bus?' questions.",
      inputSchema: {
        originCampusId: z.number().int().positive(),
        destinationCampusId: z.number().int().positive(),
        atTime: flexDateInputSchema
          .optional()
          .describe(
            "Anchor the departure query to this moment instead of the server clock. Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        dayType: busDayTypeSchema,
        includeDeparted: z.boolean().default(false),
        limit: z.number().int().min(1).max(20).default(5),
        versionKey: z.string().trim().min(1).optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async (
      {
        originCampusId,
        destinationCampusId,
        atTime,
        dayType,
        includeDeparted,
        limit,
        versionKey,
        locale,
        mode,
      },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const result = await getNextBusDepartures({
        locale,
        originCampusId,
        destinationCampusId,
        atTime,
        dayType,
        includeDeparted,
        limit,
        versionKey,
        userId: getUserId(extra.authInfo),
      });

      if (result && resolvedMode !== "full") {
        return jsonToolResult(
          {
            ...result,
            departures: omitRepeatedCampusesFromDepartures(result.departures),
            nextAvailableDeparture: result.nextAvailableDeparture
              ? summarizeBusDeparture(result.nextAvailableDeparture)
              : null,
          },
          { mode: resolvedMode },
        );
      }

      return jsonToolResult(
        result ?? {
          hasData: false,
          message: "No bus schedule data available",
        },
        { mode: resolvedMode },
      );
    },
  );
}
