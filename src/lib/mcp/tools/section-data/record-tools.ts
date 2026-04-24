import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { buildPaginatedResponse, normalizePagination } from "@/lib/api/helpers";
import { getPrisma } from "@/lib/db/prisma";
import {
  jsonToolResult,
  mcpModeInputSchema,
  parseRequiredDateInput,
  resolveMcpMode,
  resolveSectionByJwId,
} from "@/lib/mcp/tools/_helpers";
import {
  sectionExamInclude,
  sectionNotFoundToolResult,
  sectionScheduleInclude,
  sectionScheduleListInclude,
} from "./shared";

export function registerSectionRecordTools(server: McpServer) {
  server.registerTool(
    "query_schedules",
    {
      description:
        "Query public schedules with optional section, teacher, room, date range, and weekday filters.",
      inputSchema: {
        sectionId: z.number().int().positive().optional(),
        teacherId: z.number().int().positive().optional(),
        roomId: z.number().int().positive().optional(),
        weekday: z.number().int().min(1).max(7).optional(),
        dateFrom: z.string().datetime({ offset: true }).optional(),
        dateTo: z.string().datetime({ offset: true }).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({
      sectionId,
      teacherId,
      roomId,
      weekday,
      dateFrom,
      dateTo,
      page,
      limit,
      locale,
      mode,
    }) => {
      const localizedPrisma = getPrisma(locale);
      const pagination = normalizePagination({ page, pageSize: limit });
      const where = {
        ...(sectionId ? { sectionId } : {}),
        ...(teacherId
          ? {
              teachers: {
                some: {
                  id: teacherId,
                },
              },
            }
          : {}),
        ...(roomId ? { roomId } : {}),
        ...(weekday ? { weekday } : {}),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: parseRequiredDateInput(dateFrom) } : {}),
                ...(dateTo ? { lte: parseRequiredDateInput(dateTo) } : {}),
              },
            }
          : {}),
      };

      const [schedules, total] = await Promise.all([
        localizedPrisma.schedule.findMany({
          where,
          skip: pagination.skip,
          take: pagination.pageSize,
          include: sectionScheduleInclude,
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        }),
        localizedPrisma.schedule.count({ where }),
      ]);

      return jsonToolResult(
        buildPaginatedResponse(
          schedules,
          pagination.page,
          pagination.pageSize,
          total,
        ),
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_schedules_by_section",
    {
      description:
        "List schedules for a section by JW ID, ordered by date and start time.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, limit, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return sectionNotFoundToolResult(sectionJwId, mode);
      }

      const schedules = await localizedPrisma.schedule.findMany({
        where: { sectionId: section.id },
        include: sectionScheduleListInclude,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: limit,
      });

      return jsonToolResult(
        {
          found: true,
          section,
          schedules,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_exams_by_section",
    {
      description:
        "List exams for a section by JW ID, including exam batch and exam rooms.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return sectionNotFoundToolResult(sectionJwId, mode);
      }

      const exams = await localizedPrisma.exam.findMany({
        where: { sectionId: section.id },
        include: sectionExamInclude,
        orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { jwId: "asc" }],
      });

      return jsonToolResult(
        {
          found: true,
          section,
          exams,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}
