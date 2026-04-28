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
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";

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
    notice: result.notice?.message ? { message: result.notice.message } : null,
  };
}

export function registerBusTools(server: McpServer) {
  server.registerTool(
    "query_bus_timetable",
    {
      description:
        "Query the full USTC shuttle bus timetable dataset. Returns campuses, routes, both weekday and weekend trips, and the active timetable version without filtering or ranking so clients can decide locally which routes to show.",
      inputSchema: {
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
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
        "List shuttle bus routes and campuses for the currently effective timetable version. Returns route names, stop sequences, and campus details (no trip/timetable data). Use this for route discovery before querying timetables.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
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
        "Get the full timetable for a specific bus route, including both weekday and weekend schedules. Also returns alternate routes that share the same origin and destination campuses. Use list_bus_routes first to find route IDs.",
      inputSchema: {
        routeId: z.number().int().positive(),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
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
        "Search shuttle bus routes with optional origin and destination campus filters.",
      inputSchema: {
        originCampusId: z.number().int().positive().optional(),
        destinationCampusId: z.number().int().positive().optional(),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
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
        "Get the next shuttle departures between two campuses instead of the full timetable.",
      inputSchema: {
        originCampusId: z.number().int().positive(),
        destinationCampusId: z.number().int().positive(),
        atTime: z.string().datetime({ offset: true }).optional(),
        dayType: busDayTypeSchema,
        includeDeparted: z.boolean().default(false),
        limit: z.number().int().min(1).max(20).default(5),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
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

      return jsonToolResult(
        result ?? {
          hasData: false,
          message: "No bus schedule data available",
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );
}
