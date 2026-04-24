import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import { getSubscribedSectionIds } from "@/features/home/server/subscribed-data";
import {
  getUserCalendarSubscription,
  SECTION_SUBSCRIPTION_NOTE,
  subscribeUserToSectionByJwId,
  unsubscribeUserFromSectionByJwId,
} from "@/features/home/server/subscriptions";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  findSectionCodeMatches,
  findSectionCompactByJwId,
} from "@/lib/course-section-queries";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  parseRequiredDateInput,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import { sectionCompactInclude } from "@/lib/query-helpers";
import { getPublicOrigin } from "@/lib/site-url";

export function registerCalendarTools(server: McpServer) {
  server.registerTool(
    "get_my_calendar_subscription",
    {
      description:
        "Get the sections you follow in Life@USTC and the personal calendar feed path for the authenticated user. This does not represent official USTC course enrollment.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const subscription = await getUserCalendarSubscription(userId, locale);
      if (!subscription) {
        return jsonToolResult({
          success: false,
          message: "User not found",
        });
      }

      return jsonToolResult(
        {
          success: true,
          subscription,
        },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "list_my_subscribed_sections",
    {
      description:
        "List sections currently followed by the authenticated user for dashboard and calendar personalization only.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const subscription = await getUserCalendarSubscription(
        getUserId(extra.authInfo),
        locale,
      );

      return jsonToolResult(
        {
          success: Boolean(subscription),
          sections: subscription?.sections ?? [],
          note: SECTION_SUBSCRIPTION_NOTE,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "subscribe_section_by_jw_id",
    {
      description:
        "Follow one section by JW ID for Life@USTC dashboard and calendar personalization. This does not represent official USTC course enrollment.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }, extra) => {
      const subscription = await subscribeUserToSectionByJwId(
        getUserId(extra.authInfo),
        jwId,
        locale,
      );

      return jsonToolResult(
        {
          success: Boolean(subscription),
          subscription,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "unsubscribe_section_by_jw_id",
    {
      description:
        "Unfollow one section by JW ID for Life@USTC dashboard and calendar personalization.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }, extra) => {
      const subscription = await unsubscribeUserFromSectionByJwId(
        getUserId(extra.authInfo),
        jwId,
        locale,
      );

      return jsonToolResult(
        {
          success: Boolean(subscription),
          subscription,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "get_section_calendar_subscription",
    {
      description:
        "Get the single-section iCal feed link for a section by JW ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }) => {
      const section = await findSectionCompactByJwId(jwId, locale);

      return jsonToolResult(
        {
          found: Boolean(section),
          section,
          calendarPath: `/api/sections/${jwId}/calendar.ics`,
          calendarUrl: `${getPublicOrigin()}/api/sections/${jwId}/calendar.ics`,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );

  server.registerTool(
    "subscribe_my_sections_by_codes",
    {
      description:
        "Subscribe the authenticated user to matched section codes in one semester for Life@USTC only. This does not represent official USTC course enrollment.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const localizedPrisma = getPrisma(locale);

      const matches = await findSectionCodeMatches(codes, locale, semesterId);
      if (!matches) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }
      const matchedSections = matches.sections;

      const existingIds = new Set(await getSubscribedSectionIds(userId));
      const existingIdsBefore = new Set(existingIds);
      const matchedIds = matchedSections.map((section) => section.id);
      for (const id of matchedIds) {
        existingIds.add(id);
      }
      const nextIds = Array.from(existingIds);
      const addedCount = matchedIds.filter(
        (id) => !existingIdsBefore.has(id),
      ).length;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscribedSections: {
            set: nextIds.map((id) => ({ id })),
          },
        },
      });

      const updatedUser = await localizedPrisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          subscribedSections: {
            include: sectionCompactInclude,
            orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
          },
        },
      });

      return jsonToolResult(
        {
          success: true,
          semester: matches.semester,
          matchedCodes: matches.matchedCodes,
          unmatchedCodes: matches.unmatchedCodes,
          addedCount,
          subscription: {
            userId: updatedUser.id,
            sections: updatedUser.subscribedSections,
            note: SECTION_SUBSCRIPTION_NOTE,
          },
        },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "list_my_calendar_events",
    {
      description:
        "List unified calendar events for the authenticated user across schedules, homework deadlines, exams, and todos.",
      inputSchema: {
        dateFrom: z.string().datetime({ offset: true }).optional(),
        dateTo: z.string().datetime({ offset: true }).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ dateFrom, dateTo, locale, mode }, extra) => {
      const events = await listUserCalendarEvents(getUserId(extra.authInfo), {
        locale,
        dateFrom: dateFrom ? parseRequiredDateInput(dateFrom) : undefined,
        dateTo: dateTo ? parseRequiredDateInput(dateTo) : undefined,
      });

      return jsonToolResult(
        {
          events,
        },
        { mode: resolveMcpMode(mode) },
      );
    },
  );
}
