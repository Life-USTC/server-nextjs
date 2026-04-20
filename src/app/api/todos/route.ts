import {
  badRequest,
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import {
  todoCreateRequestSchema,
  todosQuerySchema,
} from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/time/parse-date-input";
export const dynamic = "force-dynamic";

/**
 * List todos for the current user.
 * @params todosQuerySchema
 * @response todosListResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = todosQuerySchema.safeParse({
    completed: searchParams.get("completed") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    dueBefore: searchParams.get("dueBefore") ?? undefined,
    dueAfter: searchParams.get("dueAfter") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid todo query", parsedQuery.error, 400);
  }

  const where: Record<string, unknown> = { userId };
  if (parsedQuery.data.completed === "true") where.completed = true;
  else if (parsedQuery.data.completed === "false") where.completed = false;
  if (parsedQuery.data.priority) where.priority = parsedQuery.data.priority;
  if (parsedQuery.data.dueBefore || parsedQuery.data.dueAfter) {
    const dueAtFilter: Record<string, Date> = {};
    if (parsedQuery.data.dueBefore)
      dueAtFilter.lt = new Date(parsedQuery.data.dueBefore);
    if (parsedQuery.data.dueAfter)
      dueAtFilter.gte = new Date(parsedQuery.data.dueAfter);
    where.dueAt = dueAtFilter;
  }

  try {
    const todos = await prisma.todo.findMany({
      where,
      orderBy: [{ completed: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });

    return jsonResponse({ todos });
  } catch (error) {
    return handleRouteError("Failed to fetch todos", error);
  }
}

/**
 * Create a todo for the current user.
 * @body todoCreateRequestSchema
 * @response idResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid todo request", error, 400);
  }

  const parsedBody = todoCreateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid todo request", parsedBody.error, 400);
  }

  const dueAt = parseDateInput(parsedBody.data.dueAt);
  if (dueAt === undefined) {
    return badRequest("Invalid due date");
  }

  try {
    const todo = await prisma.todo.create({
      data: {
        userId,
        title: parsedBody.data.title,
        content: parsedBody.data.content?.trim() || null,
        priority: parsedBody.data.priority ?? "medium",
        dueAt,
      },
    });

    return jsonResponse({ id: todo.id });
  } catch (error) {
    return handleRouteError("Failed to create todo", error);
  }
}
