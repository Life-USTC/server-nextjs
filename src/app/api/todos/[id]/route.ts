import {
  badRequest,
  forbidden,
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteJsonBody,
  parseRouteParams,
  unauthorized,
} from "@/lib/api/helpers";
import {
  resourceIdPathParamsSchema,
  todoUpdateRequestSchema,
} from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/time/parse-date-input";

export const dynamic = "force-dynamic";

async function parseTodoId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid todo ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }
  return parsed.id;
}

/**
 * Update one todo.
 * @pathParams resourceIdPathParamsSchema
 * @body todoUpdateRequestSchema
 * @response successResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseTodoId(params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;

  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const parsedBody = await parseRouteJsonBody(
    request,
    todoUpdateRequestSchema,
    "Invalid todo update",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const hasDueAt = Object.hasOwn(parsedBody, "dueAt");
  const dueAt = hasDueAt ? parseDateInput(parsedBody.dueAt) : undefined;
  if (hasDueAt && dueAt === undefined) {
    return badRequest("Invalid due date");
  }

  try {
    const todo = await prisma.todo.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!todo) {
      return notFound();
    }

    if (todo.userId !== userId) {
      return forbidden();
    }

    const updates: Record<string, unknown> = {};
    if (parsedBody.title !== undefined) updates.title = parsedBody.title;
    if (Object.hasOwn(parsedBody, "content")) {
      updates.content = parsedBody.content?.trim() || null;
    }
    if (parsedBody.priority !== undefined)
      updates.priority = parsedBody.priority;
    if (hasDueAt) updates.dueAt = dueAt;
    if (parsedBody.completed !== undefined)
      updates.completed = parsedBody.completed;

    if (Object.keys(updates).length === 0) {
      return badRequest("No changes");
    }

    await prisma.todo.update({ where: { id }, data: updates });

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to update todo", error);
  }
}

/**
 * Delete one todo.
 * @pathParams resourceIdPathParamsSchema
 * @response successResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseTodoId(params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;

  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  try {
    const todo = await prisma.todo.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!todo) {
      return notFound();
    }

    if (todo.userId !== userId) {
      return forbidden();
    }

    await prisma.todo.delete({ where: { id } });

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete todo", error);
  }
}
