import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import {
  badRequest,
  handleRouteError,
  jsonResponse,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

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
 * Soft delete one homework (admin).
 * @pathParams resourceIdPathParamsSchema
 * @response successResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const parsed = await parseHomeworkId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const homework = await prisma.homework.findUnique({
      where: { id },
      select: { id: true, title: true, deletedAt: true, sectionId: true },
    });

    if (!homework) {
      return notFound();
    }

    if (homework.deletedAt) {
      return jsonResponse({ success: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.homework.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: admin.userId,
          updatedById: admin.userId,
        },
      });

      await tx.homeworkAuditLog.create({
        data: {
          action: "deleted",
          sectionId: homework.sectionId,
          homeworkId: homework.id,
          actorId: admin.userId,
          titleSnapshot: homework.title,
        },
      });
    });

    return jsonResponse({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete homework (admin)", error);
  }
}
