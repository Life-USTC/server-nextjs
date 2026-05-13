import {
  badRequest,
  handleRouteError,
  jsonResponse,
  parseRouteInput,
  parseRouteJsonBody,
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
  const parsedQuery = parseRouteInput(
    {
      completed: searchParams.get("completed") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      dueBefore: searchParams.get("dueBefore") ?? undefined,
      dueAfter: searchParams.get("dueAfter") ?? undefined,
    },
    todosQuerySchema,
    "Invalid todo query",
    { logErrors: true },
  );
  if (parsedQuery instanceof Response) {
    return parsedQuery;
  }

  const where: Record<string, unknown> = { userId };
  if (parsedQuery.completed === "true") where.completed = true;
  else if (parsedQuery.completed === "false") where.completed = false;
  if (parsedQuery.priority) where.priority = parsedQuery.priority;
  if (parsedQuery.dueBefore || parsedQuery.dueAfter) {
    const dueAtFilter: Record<string, Date> = {};
    if (parsedQuery.dueBefore) dueAtFilter.lt = new Date(parsedQuery.dueBefore);
    if (parsedQuery.dueAfter) dueAtFilter.gte = new Date(parsedQuery.dueAfter);
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

  const parsedBody = await parseRouteJsonBody(
    request,
    todoCreateRequestSchema,
    "Invalid todo request",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const dueAt = parseDateInput(parsedBody.dueAt);
  if (dueAt === undefined) {
    return badRequest("Invalid due date");
  }

  try {
    const todo = await prisma.todo.create({
      data: {
        userId,
        title: parsedBody.title,
        content: parsedBody.content?.trim() || null,
        priority: parsedBody.priority ?? "medium",
        dueAt,
      },
    });

    return jsonResponse({ id: todo.id });
  } catch (error) {
    return handleRouteError("Failed to create todo", error);
  }
}
