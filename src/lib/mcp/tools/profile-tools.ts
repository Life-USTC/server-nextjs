import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  getUserId,
  jsonToolResult,
  mcpModeInputSchema,
  resolveMcpMode,
  todoPrioritySchema,
} from "@/lib/mcp/tools/_helpers";
import { parseDateInput } from "@/lib/time/parse-date-input";

export function registerProfileTools(server: McpServer) {
  server.registerTool(
    "get_my_profile",
    {
      description:
        "Return the authenticated user's Life@USTC profile: id, username, name, image, isAdmin, timestamps.",
      inputSchema: {
        mode: mcpModeInputSchema,
      },
    },
    async ({ mode }, extra) => {
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

      return jsonToolResult(user, {
        mode: resolveMcpMode(mode),
      });
    },
  );

  server.registerTool(
    "list_my_todos",
    {
      description:
        "List todos. Incomplete items appear first by default. Returns counts (incomplete, completed, overdue) plus the todo list.",
      inputSchema: {
        includeCompleted: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
        mode: mcpModeInputSchema,
      },
    },
    async ({ includeCompleted, limit, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const [incompleteCount, completedCount, overdueCount, todos] =
        await Promise.all([
          prisma.todo.count({
            where: { userId, completed: false },
          }),
          prisma.todo.count({
            where: { userId, completed: true },
          }),
          prisma.todo.count({
            where: {
              userId,
              completed: false,
              dueAt: { lt: new Date() },
            },
          }),
          prisma.todo.findMany({
            where: {
              userId,
              ...(includeCompleted ? {} : { completed: false }),
            },
            select: {
              id: true,
              title: true,
              content: true,
              priority: true,
              dueAt: true,
              completed: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: [
              { completed: "asc" },
              { dueAt: "asc" },
              { createdAt: "desc" },
            ],
            take: limit,
          }),
        ]);
      return jsonToolResult(
        {
          counts: {
            incomplete: incompleteCount,
            completed: completedCount,
            overdue: overdueCount,
          },
          todos,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "create_my_todo",
    {
      description: "Create a new personal todo.",
      inputSchema: {
        title: z.string().trim().min(1).max(200),
        content: z.string().max(4000).optional().nullable(),
        priority: todoPrioritySchema.default("medium"),
        dueAt: z.union([z.string(), z.null()]).optional(),
        mode: mcpModeInputSchema,
      },
    },
    async ({ title, content, priority, dueAt, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const parsedDueAt = parseDateInput(dueAt);
      if (parsedDueAt === undefined) {
        return jsonToolResult({
          success: false,
          message: "Invalid due date",
        });
      }

      const todo = await prisma.todo.create({
        select: { id: true },
        data: {
          userId,
          title,
          content: content?.trim() || null,
          priority,
          dueAt: parsedDueAt,
        },
      });

      return jsonToolResult(
        {
          success: true,
          id: todo.id,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "update_my_todo",
    {
      description:
        "Update a todo by ID. Returns the updated todo snapshot. Only the owner can update.",
      inputSchema: {
        id: z.string().trim().min(1),
        title: z.string().trim().min(1).max(200).optional(),
        content: z.string().max(4000).optional().nullable(),
        priority: todoPrioritySchema.optional(),
        dueAt: z.union([z.string(), z.null()]).optional(),
        completed: z.boolean().optional(),
        mode: mcpModeInputSchema,
      },
    },
    async ({ id, title, content, priority, dueAt, completed, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const todo = await prisma.todo.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!todo) {
        return jsonToolResult({
          success: false,
          message: "Todo not found",
        });
      }

      if (todo.userId !== userId) {
        return jsonToolResult({
          success: false,
          message: "Forbidden",
        });
      }

      const hasDueAt = dueAt !== undefined;
      const parsedDueAt = hasDueAt ? parseDateInput(dueAt) : undefined;
      if (hasDueAt && parsedDueAt === undefined) {
        return jsonToolResult({
          success: false,
          message: "Invalid due date",
        });
      }

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content?.trim() || null;
      if (priority !== undefined) updates.priority = priority;
      if (hasDueAt) updates.dueAt = parsedDueAt;
      if (completed !== undefined) updates.completed = completed;

      if (Object.keys(updates).length === 0) {
        return jsonToolResult({
          success: false,
          message: "No changes",
        });
      }

      await prisma.todo.update({
        where: { id },
        data: updates,
      });

      const updatedTodo = await prisma.todo.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          dueAt: true,
          completed: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return jsonToolResult(
        {
          success: true,
          todo: updatedTodo,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "delete_my_todo",
    {
      description: "Delete a todo by ID. Only the owner can delete.",
      inputSchema: {
        id: z.string().trim().min(1),
        mode: mcpModeInputSchema,
      },
    },
    async ({ id, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const todo = await prisma.todo.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!todo) {
        return jsonToolResult({
          success: false,
          message: "Todo not found",
        });
      }

      if (todo.userId !== userId) {
        return jsonToolResult({
          success: false,
          message: "Forbidden",
        });
      }

      await prisma.todo.delete({ where: { id } });
      return jsonToolResult(
        {
          success: true,
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );
}
