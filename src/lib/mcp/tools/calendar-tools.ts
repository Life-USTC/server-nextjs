import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import {
  getSubscribedSectionIds,
  getUserCalendarSubscription,
  SECTION_SUBSCRIPTION_NOTE,
} from "@/features/home/server/subscription-read-model";
import {
  addUserSectionSubscriptions,
  subscribeUserToSectionByJwId,
  unsubscribeUserFromSectionByJwId,
} from "@/features/home/server/subscriptions";
import {
  findSectionCodeMatches,
  findSectionCompactByJwId,
} from "@/lib/course-section-queries";
import { prisma } from "@/lib/db/prisma";
import {
  flexDateInputSchema,
  getUserId,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import {
  summarizeCalendarSubscription,
  summarizeCalendarSubscriptionBrief,
} from "@/lib/mcp/tools/calendar-summary";
import { summarizeCalendarEventCollection } from "@/lib/mcp/tools/event-summary";
import { getPublicOrigin } from "@/lib/site-url";
import { parseDateInput } from "@/lib/time/parse-date-input";

const DATE_ONLY_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnlyInput(value: unknown) {
  return (
    typeof value === "string" && DATE_ONLY_INPUT_PATTERN.test(value.trim())
  );
}

function getCalendarSubscriptionReadPayload(
  subscription: NonNullable<
    Awaited<ReturnType<typeof getUserCalendarSubscription>>
  >,
  mode: "summary" | "default" | "full",
) {
  if (mode === "full") {
    return subscription;
  }
  if (mode === "summary") {
    return summarizeCalendarSubscriptionBrief(subscription);
  }
  return summarizeCalendarSubscription(subscription);
}

function getCalendarSubscriptionMutationPayload(
  subscription: NonNullable<
    Awaited<ReturnType<typeof getUserCalendarSubscription>>
  >,
  mode: "summary" | "default" | "full",
) {
  if (mode === "full") {
    return subscription;
  }
  return summarizeCalendarSubscriptionBrief(subscription);
}

export function registerCalendarTools(server: McpServer) {
  server.registerTool(
    "get_my_calendar_subscription",
    {
      description:
        "Get followed sections and the personal iCal calendar feed URL. Following is not official USTC enrollment.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
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
          subscription: getCalendarSubscriptionReadPayload(
            subscription,
            resolvedMode,
          ),
        },
        { mode: resolvedMode === "full" ? "full" : "default" },
      );
    },
  );

  server.registerTool(
    "list_my_subscribed_sections",
    {
      description:
        "List sections currently followed for dashboard and calendar personalization. Not official enrollment.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
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
        "Follow one section by JW ID for dashboard/calendar. Not official USTC enrollment. " +
        "Use match_section_codes or search_sections first to find the jwId.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const existingSubscription = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscribedSections: {
            where: { jwId },
            select: { id: true },
          },
        },
      });
      const alreadySubscribed =
        (existingSubscription?.subscribedSections.length ?? 0) > 0;
      const subscription = await subscribeUserToSectionByJwId(
        userId,
        jwId,
        locale,
      );

      return jsonToolResult(
        {
          success: Boolean(subscription),
          action: subscription
            ? alreadySubscribed
              ? "already_subscribed"
              : "subscribed"
            : "not_found",
          sectionJwId: jwId,
          subscription: subscription
            ? getCalendarSubscriptionMutationPayload(subscription, resolvedMode)
            : null,
        },
        { mode: resolvedMode === "full" ? "full" : "default" },
      );
    },
  );

  server.registerTool(
    "unsubscribe_section_by_jw_id",
    {
      description: "Unfollow one section by JW ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const existingSubscription = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscribedSections: {
            where: { jwId },
            select: { id: true },
          },
        },
      });
      const wasSubscribed =
        (existingSubscription?.subscribedSections.length ?? 0) > 0;
      const subscription = await unsubscribeUserFromSectionByJwId(
        userId,
        jwId,
        locale,
      );

      return jsonToolResult(
        {
          success: Boolean(subscription),
          action: subscription
            ? wasSubscribed
              ? "unsubscribed"
              : "not_subscribed"
            : "not_found",
          sectionJwId: jwId,
          subscription: subscription
            ? getCalendarSubscriptionMutationPayload(subscription, resolvedMode)
            : null,
        },
        { mode: resolvedMode === "full" ? "full" : "default" },
      );
    },
  );

  server.registerTool(
    "get_section_calendar_subscription",
    {
      description: "Get the iCal feed URL for a single section by JW ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
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
        "Match section codes and subscribe in one step. Not official enrollment. " +
        "Use match_section_codes first for a dry-run preview when confirmation is needed.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);

      const matches = await findSectionCodeMatches(codes, locale, semesterId);
      if (!matches) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }
      const matchedSections = matches.sections;

      const existingIdsBefore = new Set(await getSubscribedSectionIds(userId));
      const matchedIds = matchedSections.map((section) => section.id);
      const addedCount = matchedIds.filter(
        (id) => !existingIdsBefore.has(id),
      ).length;

      await addUserSectionSubscriptions(userId, matchedIds);
      const subscription = await getUserCalendarSubscription(userId, locale);

      return jsonToolResult(
        {
          success: true,
          semester: matches.semester,
          matchedCodes: matches.matchedCodes,
          unmatchedCodes: matches.unmatchedCodes,
          addedCount,
          alreadySubscribedCount: matchedIds.length - addedCount,
          subscription: subscription
            ? getCalendarSubscriptionMutationPayload(subscription, resolvedMode)
            : null,
        },
        { mode: resolvedMode === "full" ? "full" : "default" },
      );
    },
  );

  server.registerTool(
    "list_my_calendar_events",
    {
      description:
        "Unified personal calendar events (schedules, homework deadlines, exams, todos) filtered by date range. " +
        "Use get_my_7days_timeline for a no-date-required 7-day window.",
      inputSchema: {
        dateFrom: flexDateInputSchema
          .optional()
          .describe(
            "Start of the date range (inclusive). Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        dateTo: flexDateInputSchema
          .optional()
          .describe(
            "End of the date range (inclusive). Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ dateFrom, dateTo, locale, mode }, extra) => {
      const parsedDateFrom = dateFrom ? parseDateInput(dateFrom) : undefined;
      const parsedDateTo = dateTo ? parseDateInput(dateTo) : undefined;
      if (parsedDateFrom === undefined && dateFrom) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateFrom: "${dateFrom}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      if (parsedDateTo === undefined && dateTo) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateTo: "${dateTo}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const events = await listUserCalendarEvents(getUserId(extra.authInfo), {
        locale,
        dateFrom: parsedDateFrom instanceof Date ? parsedDateFrom : undefined,
        dateTo: parsedDateTo instanceof Date ? parsedDateTo : undefined,
        dateFromIsDateOnly: isDateOnlyInput(dateFrom),
        dateToIsDateOnly: isDateOnlyInput(dateTo),
        dateToInclusive: true,
      });
      const resolvedMode = resolveMcpMode(mode);

      if (resolvedMode === "summary") {
        return jsonToolResult(
          {
            events: summarizeCalendarEventCollection(events, {
              itemLimit: 5,
              dayLimit: 7,
            }),
          },
          { mode: "default" },
        );
      }

      return jsonToolResult(
        {
          events,
        },
        { mode: resolvedMode },
      );
    },
  );
}
