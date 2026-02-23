import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api-helpers";
import {
  homeworkCompletionRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function parseHomeworkId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid homework ID");
  }

  return parsed.data.id;
}

/**
 * Update completion state for one homework.
 * @pathParams resourceIdPathParamsSchema
 * @body homeworkCompletionRequestSchema
 * @response homeworkCompletionResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseHomeworkId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid completion payload", error, 400);
  }

  const parsedBody = homeworkCompletionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid completion payload",
      parsedBody.error,
      400,
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
  }

  try {
    const homework = await prisma.homework.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!homework || homework.deletedAt) {
      return notFound();
    }

    if (parsedBody.data.completed) {
      const completion = await prisma.homeworkCompletion.upsert({
        where: { userId_homeworkId: { userId, homeworkId: id } },
        update: { completedAt: new Date() },
        create: { userId, homeworkId: id },
      });

      return NextResponse.json({
        completed: true,
        completedAt: completion.completedAt,
      });
    }

    await prisma.homeworkCompletion.deleteMany({
      where: { userId, homeworkId: id },
    });

    return NextResponse.json({ completed: false, completedAt: null });
  } catch (error) {
    return handleRouteError("Failed to update completion", error);
  }
}
