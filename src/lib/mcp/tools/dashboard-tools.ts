import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAssistantDashboardSnapshot } from "@/features/home/server/assistant-dashboard-snapshot";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import {
  flexDateInputSchema,
  getUserId,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";
import {
  compactDashboardSnapshot,
  summarizeDashboardSnapshot,
} from "@/lib/mcp/tools/dashboard-summary";
import { parseDateInput } from "@/lib/time/parse-date-input";

export function registerDashboardTools(server: McpServer) {
  server.registerTool(
    "get_my_dashboard",
    {
      description:
        "Single-call snapshot: current courses, next class, upcoming deadlines, todo count, and preferred shuttle. " +
        "Start here for most assistant workflows before fanning out to specific tools.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const snapshot = await getAssistantDashboardSnapshot({
        userId: getUserId(extra.authInfo),
        locale,
      });
      if (resolvedMode === "full") {
        return jsonToolResult(snapshot, { mode: "full" });
      }
      if (resolvedMode === "summary") {
        return jsonToolResult(summarizeDashboardSnapshot(snapshot), {
          mode: "default",
        });
      }
      return jsonToolResult(compactDashboardSnapshot(snapshot), {
        mode: "default",
      });
    },
  );

  server.registerTool(
    "get_next_class",
    {
      description:
        "Next upcoming class from followed sections. Lightweight alternative when only the next class is needed.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
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
        "Merged list of upcoming homework deadlines, exams, and due todos within dayLimit days (default 7). " +
        "Pass atTime to anchor the window instead of using the server clock.",
      inputSchema: {
        dayLimit: z.number().int().min(1).max(30).default(7),
        atTime: flexDateInputSchema
          .optional()
          .describe(
            "Override the reference time for the deadline window. Defaults to now. Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ dayLimit, atTime, locale, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      let now: Date;
      if (atTime) {
        const parsed = parseDateInput(atTime);
        if (!(parsed instanceof Date)) {
          return jsonToolResult({
            success: false,
            message: `Invalid atTime: "${atTime}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
          });
        }
        now = parsed;
      } else {
        now = new Date();
      }
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
