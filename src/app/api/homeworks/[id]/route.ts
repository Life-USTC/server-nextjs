import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { homeworkUpdateRequestSchema } from "@/lib/api-schemas";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid homework update", error, 400);
  }

  const parsedBody = homeworkUpdateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid homework update", parsedBody.error, 400);
  }

  const title = parsedBody.data.title;

  const hasPublishedAt = Object.hasOwn(parsedBody.data, "publishedAt");
  const hasSubmissionStartAt = Object.hasOwn(
    parsedBody.data,
    "submissionStartAt",
  );
  const hasSubmissionDueAt = Object.hasOwn(parsedBody.data, "submissionDueAt");

  const publishedAt = hasPublishedAt
    ? parseDateValue(parsedBody.data.publishedAt)
    : undefined;
  const submissionStartAt = hasSubmissionStartAt
    ? parseDateValue(parsedBody.data.submissionStartAt)
    : undefined;
  const submissionDueAt = hasSubmissionDueAt
    ? parseDateValue(parsedBody.data.submissionDueAt)
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
    const homework = await prisma.homework.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
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
    if (parsedBody.data.isMajor !== undefined) {
      updates.isMajor = parsedBody.data.isMajor === true;
    }
    if (parsedBody.data.requiresTeam !== undefined) {
      updates.requiresTeam = parsedBody.data.requiresTeam === true;
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

    await prisma.homework.update({
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
    const homework = await prisma.homework.findUnique({
      where: { id },
      select: { id: true, title: true, createdById: true, sectionId: true },
    });

    if (!homework) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!viewer.isAdmin && homework.createdById !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.homework.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
          updatedById: userId,
        },
      });

      await tx.homeworkAuditLog.create({
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
