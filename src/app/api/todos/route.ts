import { auth } from "@/auth";
import {
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import { todoCreateRequestSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/time/parse-date-input";
export const dynamic = "force-dynamic";

/**
 * List todos for the current user.
 * @response todosListResponseSchema
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
  }

  try {
    const todos = await prisma.todo.findMany({
      where: { userId },
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
  const session = await auth();
  const userId = session?.user?.id ?? null;
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
    return jsonResponse({ error: "Invalid due date" }, { status: 400 });
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
