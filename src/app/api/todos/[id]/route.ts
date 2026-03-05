import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError, notFound, unauthorized } from "@/lib/api/helpers";
import {
  resourceIdPathParamsSchema,
  todoUpdateRequestSchema,
} from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function parseTodoId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }
  return parsed.data.id;
}

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

  const session = await auth();
  const userId = session?.user?.id ?? null;
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
  const dueAt = hasDueAt ? parseDateValue(parsedBody.data.dueAt) : undefined;
  if (hasDueAt && dueAt === undefined) {
    return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    await prisma.todo.update({ where: { id }, data: updates });

    return NextResponse.json({ success: true });
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseTodoId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  const session = await auth();
  const userId = session?.user?.id ?? null;
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.todo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete todo", error);
  }
}
