import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { buildPaginatedResponse, normalizePagination } from "@/lib/api/helpers";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  sectionCodeSchema,
} from "@/lib/mcp/tools/_helpers";
import {
  buildSectionSearchWhere,
  courseDetailInclude,
  courseInclude,
  ilike,
  sectionCompactInclude,
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
      const localizedPrisma = getPrisma(locale);
      const courses = await localizedPrisma.course.findMany({
        where: {
          OR: [
            { nameCn: ilike(search) },
            { nameEn: ilike(search) },
            { code: ilike(search) },
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
      const localizedPrisma = getPrisma(locale);
      const course = await localizedPrisma.course.findUnique({
        where: { jwId },
        include: courseDetailInclude,
      });

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
      const where: Prisma.SectionWhereInput = {
        ...(courseId ? { courseId } : {}),
        ...(semesterId ? { semesterId } : {}),
        ...(campusId ? { campusId } : {}),
        ...(departmentId ? { openDepartmentId: departmentId } : {}),
        ...(teacherId
          ? {
              teachers: {
                some: {
                  id: teacherId,
                },
              },
            }
          : {}),
        ...(ids?.length ? { id: { in: ids } } : {}),
      };
      const searchFilters = buildSectionSearchWhere(search);
      if (searchFilters.where?.AND) {
        const searchAnd = Array.isArray(searchFilters.where.AND)
          ? searchFilters.where.AND
          : [searchFilters.where.AND];
        const existingAnd = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];
        where.AND = [...existingAnd, ...searchAnd];
      }

      const [sections, total] = await Promise.all([
        localizedPrisma.section.findMany({
          where,
          skip: pagination.skip,
          take: pagination.pageSize,
          include: sectionInclude,
          orderBy: searchFilters.orderBy,
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
          note: SECTION_SUBSCRIPTION_NOTE,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}
