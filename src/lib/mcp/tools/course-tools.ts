import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
  mcpLocaleInputSchema,
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
      description:
        "List semesters with pagination. Use get_current_semester when you only need the active term.",
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
      description:
        "Get the semester active today. Use its id to constrain section-code matching and section search.",
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
        "Search courses by Chinese/English name or course code. Use this before search_sections when starting from a course name.",
      inputSchema: {
        search: z.string().trim().min(1),
        limit: z.number().int().min(1).max(25).default(10),
        locale: mcpLocaleInputSchema,
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
      description: "Fetch one detailed course by USTC JW course ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
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
      description:
        "Fetch one detailed section by USTC JW section ID, including course, teachers, semester, schedules, exams, and homeworks.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
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
      description:
        "Search public sections by course, semester, campus, department, teacher, IDs, or text. " +
        "Use this to find a section jwId before subscription or section-scoped schedule/homework/exam calls.",
      inputSchema: {
        courseId: z.number().int().positive().optional(),
        courseJwId: z.number().int().positive().optional(),
        semesterId: z.number().int().positive().optional(),
        semesterJwId: z.number().int().positive().optional(),
        campusId: z.number().int().positive().optional(),
        departmentId: z.number().int().positive().optional(),
        teacherId: z.number().int().positive().optional(),
        teacherCode: z.string().trim().min(1).optional(),
        ids: z.array(z.number().int().positive()).optional(),
        jwIds: z.array(z.number().int().positive()).optional(),
        search: z.string().trim().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({
      courseId,
      courseJwId,
      semesterId,
      semesterJwId,
      campusId,
      departmentId,
      teacherId,
      teacherCode,
      ids,
      jwIds,
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
        courseJwId,
        semesterId,
        semesterJwId,
        campusId,
        departmentId,
        teacherId,
        teacherCode,
        ids,
        jwIds,
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
      description:
        "Search teachers by department or name/code. Use the returned id/code to filter search_sections or query_schedules.",
      inputSchema: {
        departmentId: z.number().int().positive().optional(),
        search: z.string().trim().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: mcpLocaleInputSchema,
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
      description:
        "Fetch one detailed teacher by numeric ID, including department and related sections.",
      inputSchema: {
        id: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
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
        "Dry-run section-code matching for one semester. Returns matched/unmatched codes and suggestions. " +
        "Use before subscribe_my_sections_by_codes when the user may need confirmation. Not official enrollment.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: mcpLocaleInputSchema,
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
          suggestions: matches.suggestions,
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
