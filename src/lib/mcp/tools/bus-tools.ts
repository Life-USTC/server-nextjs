import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getBusRouteTimetable,
  listBusRoutes,
  queryBusSchedules,
} from "@/features/bus/lib/bus-service";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";

export function registerBusTools(server: McpServer) {
  server.registerTool(
    "query_bus_timetable",
    {
      description:
        "Query today's USTC shuttle bus schedule. Returns all routes with upcoming/departed trip times for the current day type (weekday or weekend). Use list_bus_routes for a lightweight route catalog, or get_bus_route_timetable for a single route's full weekday+weekend timetable.",
      inputSchema: {
        showDepartedTrips: z.boolean().default(false),
        dayType: z.enum(["weekday", "weekend", "auto"]).default("auto"),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ showDepartedTrips, dayType, versionKey, locale, mode }) => {
      const result = await queryBusSchedules({
        locale,
        showDepartedTrips,
        dayType,
        versionKey,
      });

      return jsonToolResult(
        result ?? {
          locale,
          hasData: false,
          message: "No bus schedule data available",
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_bus_routes",
    {
      description:
        "List all USTC shuttle bus routes and campuses. Returns route names, stop sequences, and campus details (no trip/timetable data). Use this for route discovery before querying timetables.",
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
}
