import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { CommentReactionType } from "@/generated/prisma/client";
import {
  badRequest,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api-helpers";
import {
  commentReactionRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api-schemas/request-schemas";
import { findActiveSuspension } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function parseCommentId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid comment ID");
  }

  return parsed.data.id;
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
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid reaction", error, 400);
  }

  const parsedBody = commentReactionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid reaction", parsedBody.error, 400);
  }
  const type = parsedBody.data.type;

  const suspension = await findActiveSuspension(session.user.id);
  if (suspension) {
    return NextResponse.json(
      {
        error: "Suspended",
        reason: suspension.reason ?? null,
      },
      { status: 403 },
    );
  }

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
          userId: session.user.id,
          type: type as CommentReactionType,
        },
      },
      update: {},
      create: {
        commentId: id,
        userId: session.user.id,
        type: type as CommentReactionType,
      },
    });

    return NextResponse.json({ success: true });
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
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const parsed = await parseCommentId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
  const { searchParams } = new URL(request.url);
  const parsedBody = commentReactionRequestSchema.safeParse({
    type: searchParams.get("type"),
  });
  if (!parsedBody.success) {
    return handleRouteError("Invalid reaction", parsedBody.error, 400);
  }
  const type = parsedBody.data.type;

  try {
    await prisma.commentReaction.deleteMany({
      where: {
        commentId: id,
        userId: session.user.id,
        type: type as CommentReactionType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to remove reaction", error);
  }
}
