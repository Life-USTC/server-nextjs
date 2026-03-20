import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { courseInclude, sectionInclude } from "@/lib/query-helpers";

const localeSchema = z.enum(["zh-cn", "en-us"]);

function jsonToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function getUserId(authInfo?: AuthInfo): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Authenticated user context is missing");
  }

  return userId;
}

export function createMcpServer() {
  const server = new McpServer({
    name: "life-ustc-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_my_profile",
    {
      description:
        "Return the authenticated Life@USTC user profile associated with the OAuth access token.",
    },
    async (extra) => {
      const userId = getUserId(extra.authInfo);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return jsonToolResult(user);
    },
  );

  server.registerTool(
    "list_my_todos",
    {
      description:
        "List todos for the authenticated Life@USTC user in due-date order.",
    },
    async (extra) => {
      const userId = getUserId(extra.authInfo);
      const todos = await prisma.todo.findMany({
        where: { userId },
        orderBy: [
          { completed: "asc" },
          { dueAt: "asc" },
          { createdAt: "desc" },
        ],
      });

      return jsonToolResult({ todos });
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
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ search, limit, locale }) => {
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

      return jsonToolResult({ courses });
    },
  );

  server.registerTool(
    "get_section_by_jw_id",
    {
      description: "Fetch a detailed section record by its USTC JW section ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ jwId, locale }) => {
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

      return jsonToolResult({
        found: true,
        section,
      });
    },
  );

  return server;
}
