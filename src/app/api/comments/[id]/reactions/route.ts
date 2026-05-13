import {
  handleRouteError,
  jsonResponse,
  notFound,
  parseRouteInput,
  parseRouteJsonBody,
  parseRouteParams,
  unauthorized,
} from "@/lib/api/helpers";
import {
  commentReactionRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import { requireWriteAuth, resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function parseCommentId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid comment ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
}

/**
 * Add one reaction to a comment.
 * @pathParams resourceIdPathParamsSchema
 * @body commentReactionRequestSchema
 * @response 200:successResponseSchema
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireWriteAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  const { userId } = auth;

  const parsed = await parseCommentId(params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;
  const parsedBody = await parseRouteJsonBody(
    request,
    commentReactionRequestSchema,
    "Invalid reaction",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }
  const type = parsedBody.type;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comment) {
      return notFound();
    }

    await prisma.commentReaction.upsert({
      where: {
        commentId_userId_type: {
          commentId: id,
          userId,
          type,
        },
      },
      update: {},
      create: {
        commentId: id,
        userId,
        type,
      },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to add reaction", error);
  }
}

/**
 * Remove one reaction from a comment.
 * @pathParams resourceIdPathParamsSchema
 * @params commentReactionRequestSchema
 * @response 200:successResponseSchema
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const parsed = await parseCommentId(params);
  if (parsed instanceof Response) {
    return parsed;
  }
  const id = parsed;
  const { searchParams } = new URL(request.url);
  const parsedBody = parseRouteInput(
    {
      type: searchParams.get("type"),
    },
    commentReactionRequestSchema,
    "Invalid reaction",
    { logErrors: true },
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }
  const type = parsedBody.type;

  try {
    await prisma.commentReaction.deleteMany({
      where: {
        commentId: id,
        userId,
        type,
      },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to remove reaction", error);
  }
}
