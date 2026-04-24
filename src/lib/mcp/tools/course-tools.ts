import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { buildPaginatedResponse, normalizePagination } from "@/lib/api/helpers";
import {
  buildSectionListQuery,
  findCourseDetailByJwId,
  findSectionByJwId,
  findSectionCodeMatches,
  listCoursesBySearch,
} from "@/lib/course-section-queries";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import {
  ilike,
  sectionInclude,
  teacherDetailInclude,
  teacherListInclude,
} from "@/lib/query-helpers";

const SECTION_SUBSCRIPTION_NOTE =
  "Life@USTC section subscriptions only affect your dashboard and calendar here. They are not official USTC course enrollment.";

export function registerCourseTools(server: McpServer) {
  server.registerTool(
    "list_semesters",
    {
      description: "List semesters with pagination.",
      inputSchema: {
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        mode: mcpModeInputSchema,
      },
    },
    async ({ page, limit, mode }) => {
      const pagination = normalizePagination({ page, pageSize: limit });
      const [semesters, total] = await Promise.all([
        prisma.semester.findMany({
          skip: pagination.skip,
          take: pagination.pageSize,
          orderBy: { startDate: "desc" },
        }),
        prisma.semester.count(),
      ]);

      return jsonToolResult(
        buildPaginatedResponse(
          semesters,
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
    "get_current_semester",
    {
      description: "Get the current semester.",
      inputSchema: {
        mode: mcpModeInputSchema,
      },
    },
    async ({ mode }) => {
      const semester = await findCurrentSemester(prisma.semester, new Date());

      return jsonToolResult(
        {
          found: Boolean(semester),
          semester,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

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
      const courses = await listCoursesBySearch(search, limit, locale);

      return jsonToolResult(
        { courses },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "get_course_by_jw_id",
    {
      description: "Fetch a detailed course record by its USTC JW course ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }) => {
      const course = await findCourseDetailByJwId(jwId, locale);

      return jsonToolResult(
        {
          found: Boolean(course),
          course,
        },
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
      const section = await findSectionByJwId(jwId, locale);

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
    "search_sections",
    {
      description: "Search sections with optional filters and pagination.",
      inputSchema: {
        courseId: z.number().int().positive().optional(),
        semesterId: z.number().int().positive().optional(),
        campusId: z.number().int().positive().optional(),
        departmentId: z.number().int().positive().optional(),
        teacherId: z.number().int().positive().optional(),
        ids: z.array(z.number().int().positive()).optional(),
        search: z.string().trim().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({
      courseId,
      semesterId,
      campusId,
      departmentId,
      teacherId,
      ids,
      search,
      page,
      limit,
      locale,
      mode,
    }) => {
      const localizedPrisma = getPrisma(locale);
      const pagination = normalizePagination({ page, pageSize: limit });
      const { where, orderBy } = buildSectionListQuery({
        courseId,
        semesterId,
        campusId,
        departmentId,
        teacherId,
        ids,
        search,
      });

      const [sections, total] = await Promise.all([
        localizedPrisma.section.findMany({
          where,
          skip: pagination.skip,
          take: pagination.pageSize,
          include: sectionInclude,
          orderBy,
        }),
        localizedPrisma.section.count({ where }),
      ]);

      return jsonToolResult(
        buildPaginatedResponse(
          sections,
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
    "search_teachers",
    {
      description: "Search teachers with optional filters and pagination.",
      inputSchema: {
        departmentId: z.number().int().positive().optional(),
        search: z.string().trim().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ departmentId, search, page, limit, locale, mode }) => {
      const localizedPrisma = getPrisma(locale);
      const pagination = normalizePagination({ page, pageSize: limit });
      const where = {
        ...(departmentId ? { departmentId } : {}),
        ...(search
          ? {
              OR: [
                { nameCn: ilike(search) },
                { nameEn: ilike(search) },
                { code: ilike(search) },
              ],
            }
          : {}),
      };

      const [teachers, total] = await Promise.all([
        localizedPrisma.teacher.findMany({
          where,
          skip: pagination.skip,
          take: pagination.pageSize,
          include: teacherListInclude,
          orderBy: { nameCn: "asc" },
        }),
        localizedPrisma.teacher.count({ where }),
      ]);

      return jsonToolResult(
        buildPaginatedResponse(
          teachers,
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
    "get_teacher_by_id",
    {
      description: "Fetch a detailed teacher record by numeric teacher ID.",
      inputSchema: {
        id: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ id, locale, mode }) => {
      const localizedPrisma = getPrisma(locale);
      const teacher = await localizedPrisma.teacher.findUnique({
        where: { id },
        include: teacherDetailInclude,
      });

      return jsonToolResult(
        {
          found: Boolean(teacher),
          teacher,
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
        "Match section codes in one semester and return matched/unmatched results for Life@USTC section subscriptions. This does not represent official USTC course enrollment.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }) => {
      const matches = await findSectionCodeMatches(codes, locale, semesterId);
      if (!matches) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }

      return jsonToolResult(
        {
          success: true,
          semester: matches.semester,
          matchedCodes: matches.matchedCodes,
          unmatchedCodes: matches.unmatchedCodes,
          sections: matches.sections,
          total: matches.total,
          note: SECTION_SUBSCRIPTION_NOTE,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}
