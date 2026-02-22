import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { CommentReactionType } from "@/generated/prisma/client";
import { handleRouteError } from "@/lib/api-helpers";
import { commentReactionRequestSchema } from "@/lib/api-schemas";
import { findActiveSuspension } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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
