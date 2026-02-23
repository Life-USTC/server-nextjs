import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api-helpers";
import {
  homeworkUpdateRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api-schemas/request-schemas";
import { findActiveSuspension, getViewerContext } from "@/lib/comment-utils";
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

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Update one homework.
 * @pathParams resourceIdPathParamsSchema
 * @body homeworkUpdateRequestSchema
 * @response successResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
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
    return badRequest("Invalid publish date");
  }
  if (hasSubmissionStartAt && submissionStartAt === undefined) {
    return badRequest("Invalid submission start");
  }
  if (hasSubmissionDueAt && submissionDueAt === undefined) {
    return badRequest("Invalid submission due");
  }

  if (
    submissionStartAt &&
    submissionDueAt &&
    submissionStartAt.getTime() > submissionDueAt.getTime()
  ) {
    return badRequest("Submission start must be before due");
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
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
      return notFound();
    }

    if (homework.deletedAt) {
      return forbidden("Homework deleted");
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
      return badRequest("No changes");
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

/**
 * Soft delete one homework.
 * @pathParams resourceIdPathParamsSchema
 * @response successResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseHomeworkId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return unauthorized();
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
      return notFound();
    }

    if (!viewer.isAdmin && homework.createdById !== userId) {
      return forbidden();
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
