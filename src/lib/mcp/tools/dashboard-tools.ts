import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAssistantDashboardSnapshot } from "@/features/home/server/assistant-dashboard-snapshot";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";

export function registerDashboardTools(server: McpServer) {
  server.registerTool(
    "get_my_dashboard",
    {
      description:
        "Get a compact dashboard snapshot for the authenticated user with current courses, next class, deadlines, todos, and preferred shuttle.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const snapshot = await getAssistantDashboardSnapshot({
        userId: getUserId(extra.authInfo),
        locale,
      });
      return jsonToolResult(snapshot, { mode: resolveMcpMode(mode) });
    },
  );

  server.registerTool(
    "get_next_class",
    {
      description:
        "Get the next upcoming class occurrence from the authenticated user's current followed sections.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const snapshot = await getAssistantDashboardSnapshot({
        userId: getUserId(extra.authInfo),
        locale,
      });
      return jsonToolResult(
        {
          found: Boolean(snapshot.nextClass),
          nextClass: snapshot.nextClass,
          currentSemester: snapshot.currentSemester,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "get_upcoming_deadlines",
    {
      description:
        "Get a merged upcoming list of homework deadlines, exams, and due todos for the authenticated user.",
      inputSchema: {
        dayLimit: z.number().int().min(1).max(30).default(7),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ dayLimit, locale, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const now = new Date();
      const dateTo = new Date(now.getTime() + dayLimit * 24 * 60 * 60 * 1000);
      const events = await listUserCalendarEvents(userId, {
        locale,
        dateFrom: now,
        dateTo,
      });
      const deadlines = events.filter(
        (event) =>
          event.type === "homework_due" ||
          event.type === "exam" ||
          event.type === "todo_due",
      );

      return jsonToolResult(
        {
          total: deadlines.length,
          deadlines,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );
}
