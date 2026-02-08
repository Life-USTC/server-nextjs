import { NextResponse } from "next/server";
import type { CommentStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["active", "softbanned", "deleted"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: string; moderationNote?: string | null } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid moderation request", error, 400);
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        status: status as CommentStatus,
        moderationNote: body.moderationNote ?? null,
        moderatedAt: new Date(),
        moderatedById: admin.userId,
        deletedAt: status === "deleted" ? new Date() : null,
      },
    });

    return NextResponse.json({ comment: updated });
  } catch (error) {
    return handleRouteError("Failed to update comment", error);
  }
}
