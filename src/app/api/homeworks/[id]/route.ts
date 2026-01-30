import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const prismaAny = prisma as typeof prisma & {
  homework: any;
  homeworkAuditLog: any;
};

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    title?: string;
    publishedAt?: string | null;
    submissionStartAt?: string | null;
    submissionDueAt?: string | null;
    isMajor?: boolean;
    requiresTeam?: boolean;
  } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid homework update", error, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  if (title !== undefined && title.length === 0) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (title && title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  const hasPublishedAt = Object.hasOwn(body, "publishedAt");
  const hasSubmissionStartAt = Object.hasOwn(body, "submissionStartAt");
  const hasSubmissionDueAt = Object.hasOwn(body, "submissionDueAt");

  const publishedAt = hasPublishedAt
    ? parseDateValue(body.publishedAt)
    : undefined;
  const submissionStartAt = hasSubmissionStartAt
    ? parseDateValue(body.submissionStartAt)
    : undefined;
  const submissionDueAt = hasSubmissionDueAt
    ? parseDateValue(body.submissionDueAt)
    : undefined;

  if (hasPublishedAt && publishedAt === undefined) {
    return NextResponse.json(
      { error: "Invalid publish date" },
      { status: 400 },
    );
  }
  if (hasSubmissionStartAt && submissionStartAt === undefined) {
    return NextResponse.json(
      { error: "Invalid submission start" },
      { status: 400 },
    );
  }
  if (hasSubmissionDueAt && submissionDueAt === undefined) {
    return NextResponse.json(
      { error: "Invalid submission due" },
      { status: 400 },
    );
  }

  if (
    submissionStartAt &&
    submissionDueAt &&
    submissionStartAt.getTime() > submissionDueAt.getTime()
  ) {
    return NextResponse.json(
      { error: "Submission start must be before due" },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return NextResponse.json(
      { error: "Suspended", reason: suspension.reason ?? null },
      { status: 403 },
    );
  }

  try {
    const homework = await prismaAny.homework.findUnique({
      where: { id },
    });

    if (!homework) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (homework.deletedAt) {
      return NextResponse.json({ error: "Homework deleted" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updatedById: userId,
    };

    if (title !== undefined) updates.title = title;
    if (body.isMajor !== undefined) updates.isMajor = body.isMajor === true;
    if (body.requiresTeam !== undefined) {
      updates.requiresTeam = body.requiresTeam === true;
    }
    if (publishedAt !== undefined) updates.publishedAt = publishedAt;
    if (submissionStartAt !== undefined) {
      updates.submissionStartAt = submissionStartAt;
    }
    if (submissionDueAt !== undefined)
      updates.submissionDueAt = submissionDueAt;

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    await prismaAny.homework.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to update homework", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return NextResponse.json(
      { error: "Suspended", reason: suspension.reason ?? null },
      { status: 403 },
    );
  }

  try {
    const viewer = await getViewerContext({ includeAdmin: true });
    const homework = await prismaAny.homework.findUnique({
      where: { id },
      select: { id: true, title: true, createdById: true, sectionId: true },
    });

    if (!homework) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!viewer.isAdmin && homework.createdById !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prismaAny.$transaction(async (tx) => {
      const txAny = tx as typeof prismaAny;
      await txAny.homework.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
          updatedById: userId,
        },
      });

      await txAny.homeworkAuditLog.create({
        data: {
          action: "deleted",
          sectionId: homework.sectionId,
          homeworkId: homework.id,
          actorId: userId,
          titleSnapshot: homework.title,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete homework", error);
  }
}
