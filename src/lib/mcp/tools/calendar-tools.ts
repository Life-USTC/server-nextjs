import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  getSubscribedSectionIds,
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import { sectionCompactInclude } from "@/lib/query-helpers";

const SECTION_SUBSCRIPTION_NOTE =
  "Life@USTC section subscriptions only affect your dashboard and calendar here. They are not official USTC course enrollment.";

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
      const localizedPrisma = getPrisma(locale);
      const token = await ensureUserCalendarFeedToken(userId);
      const user = await localizedPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscribedSections: {
            include: sectionCompactInclude,
            orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
          },
        },
      });

      if (!user) {
        return jsonToolResult({
          success: false,
          message: "User not found",
        });
      }

      return jsonToolResult(
        {
          success: true,
          subscription: {
            userId: user.id,
            sections: user.subscribedSections,
            calendarPath: buildUserCalendarFeedPath(user.id, token),
            note: SECTION_SUBSCRIPTION_NOTE,
          },
        },
        { mode: resolvedMode },
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

      const semester = semesterId
        ? await prisma.semester.findUnique({
            where: { id: semesterId },
          })
        : await findCurrentSemester(prisma.semester, new Date());

      if (!semester) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }

      const matchedSections = await localizedPrisma.section.findMany({
        where: {
          code: { in: codes },
          semesterId: semester.id,
        },
        include: sectionCompactInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
      });

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
          semester: {
            id: semester.id,
            nameCn: semester.nameCn,
            code: semester.code,
          },
          matchedCodes: matchedSections.map((section) => section.code),
          unmatchedCodes: codes.filter(
            (code) => !matchedSections.some((section) => section.code === code),
          ),
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
}
