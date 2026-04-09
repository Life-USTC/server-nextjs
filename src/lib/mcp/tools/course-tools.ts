import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import {
  courseInclude,
  sectionCompactInclude,
  sectionInclude,
} from "@/lib/query-helpers";

export function registerCourseTools(server: McpServer) {
  server.registerTool(
    "search_courses",
    {
      description:
        "Search courses by Chinese name, English name, or course code.",
      inputSchema: {
        search: z.string().trim().min(1),
        limit: z.number().int().min(1).max(25).default(10),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ search, limit, locale, mode }) => {
      const localizedPrisma = getPrisma(locale);
      const courses = await localizedPrisma.course.findMany({
        where: {
          OR: [
            { nameCn: { contains: search, mode: "insensitive" } },
            { nameEn: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        },
        include: courseInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
        take: limit,
      });

      return jsonToolResult(
        { courses },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "get_section_by_jw_id",
    {
      description: "Fetch a detailed section record by its USTC JW section ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }) => {
      const localizedPrisma = getPrisma(locale);
      const section = await localizedPrisma.section.findUnique({
        where: { jwId },
        include: sectionInclude,
      });

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${jwId} was not found`,
        });
      }

      return jsonToolResult(
        {
          found: true,
          section,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "match_section_codes",
    {
      description:
        "Match section codes in one semester and return matched/unmatched results.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }) => {
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

      const sections = await localizedPrisma.section.findMany({
        where: {
          code: { in: codes },
          semesterId: semester.id,
        },
        include: sectionCompactInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
      });

      return jsonToolResult(
        {
          success: true,
          semester: {
            id: semester.id,
            nameCn: semester.nameCn,
            code: semester.code,
          },
          matchedCodes: sections.map((section) => section.code),
          unmatchedCodes: codes.filter(
            (code) => !sections.some((section) => section.code === code),
          ),
          sections,
          total: sections.length,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}
