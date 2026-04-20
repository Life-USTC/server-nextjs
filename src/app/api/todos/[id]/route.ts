import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  handleRouteError,
  jsonResponse,
  notFound,
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
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid todo ID");
  }
  return parsed.data.id;
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
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid todo update", error, 400);
  }

  const parsedBody = todoUpdateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid todo update", parsedBody.error, 400);
  }

  const hasDueAt = Object.hasOwn(parsedBody.data, "dueAt");
  const dueAt = hasDueAt ? parseDateInput(parsedBody.data.dueAt) : undefined;
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
    if (parsedBody.data.title !== undefined)
      updates.title = parsedBody.data.title;
    if (Object.hasOwn(parsedBody.data, "content")) {
      updates.content = parsedBody.data.content?.trim() || null;
    }
    if (parsedBody.data.priority !== undefined)
      updates.priority = parsedBody.data.priority;
    if (hasDueAt) updates.dueAt = dueAt;
    if (parsedBody.data.completed !== undefined)
      updates.completed = parsedBody.data.completed;

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
  if (parsed instanceof NextResponse) {
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
