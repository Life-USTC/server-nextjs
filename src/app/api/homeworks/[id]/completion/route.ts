import {
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteJsonBody,
  parseRouteParams,
  unauthorized,
} from "@/lib/api/helpers";
import {
  homeworkCompletionRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function parseHomeworkId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid homework ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
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
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;
  const parsedBody = await parseRouteJsonBody(
    request,
    homeworkCompletionRequestSchema,
    "Invalid completion payload",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  const userId = await resolveApiUserId(request);
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

    if (parsedBody.completed) {
      const completion = await prisma.homeworkCompletion.upsert({
        where: { userId_homeworkId: { userId, homeworkId: id } },
        update: { completedAt: new Date() },
        create: { userId, homeworkId: id },
      });

      return jsonResponse({
        completed: true,
        completedAt: completion.completedAt,
      });
    }

    await prisma.homeworkCompletion.deleteMany({
      where: { userId, homeworkId: id },
    });

    return jsonResponse({ completed: false, completedAt: null });
  } catch (error) {
    return handleRouteError("Failed to update completion", error);
  }
}
