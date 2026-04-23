import type { z } from "zod";
import { findActiveSuspension } from "@/features/comments/server/comment-utils";
import { getDescriptionPayload } from "@/features/descriptions/server/descriptions-server";
import {
  badRequest,
  handleRouteError,
  jsonResponse,
  notFound,
  parseOptionalInt,
  suspensionForbidden,
  unauthorized,
} from "@/lib/api/helpers";
import {
  descriptionsQuerySchema,
  type descriptionTargetTypeSchema,
  descriptionUpsertRequestSchema,
} from "@/lib/api/schemas/request-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type TargetType = z.infer<typeof descriptionTargetTypeSchema>;

function getTargetWhere(targetType: TargetType, targetId: number | string) {
  switch (targetType) {
    case "section":
      return typeof targetId === "number" ? { sectionId: targetId } : null;
    case "course":
      return typeof targetId === "number" ? { courseId: targetId } : null;
    case "teacher":
      return typeof targetId === "number" ? { teacherId: targetId } : null;
    case "homework":
      return typeof targetId === "string" ? { homeworkId: targetId } : null;
    default:
      return null;
  }
}

async function ensureTargetExists(
  targetType: TargetType,
  targetId: number | string,
) {
  if (targetType === "section" && typeof targetId === "number") {
    return prisma.section.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "course" && typeof targetId === "number") {
    return prisma.course.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "teacher" && typeof targetId === "number") {
    return prisma.teacher.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  if (targetType === "homework" && typeof targetId === "string") {
    return prisma.homework.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
  }
  return null;
}

/**
 * Get description and history by target.
 * @params descriptionsQuerySchema
 * @response descriptionsResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = descriptionsQuerySchema.safeParse({
    targetType: searchParams.get("targetType"),
    targetId: searchParams.get("targetId") ?? "",
  });
  if (!parsedQuery.success) {
    return badRequest("Invalid target");
  }

  const targetType = parsedQuery.data.targetType;
  const targetIdParam = parsedQuery.data.targetId;
  const targetId =
    targetType === "homework" ? targetIdParam : parseOptionalInt(targetIdParam);

  if (!targetId) {
    return badRequest("Invalid target");
  }

  const whereTarget = getTargetWhere(targetType, targetId);
  if (!whereTarget) {
    return badRequest("Invalid target");
  }

  try {
    const payload = await getDescriptionPayload(targetType, targetId);
    return jsonResponse(payload);
  } catch (error) {
    return handleRouteError("Failed to fetch description", error);
  }
}

/**
 * Upsert description by target.
 * @body descriptionUpsertRequestSchema
 * @response descriptionUpsertResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid description request", error, 400);
  }

  const parsedBody = descriptionUpsertRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid description request",
      parsedBody.error,
      400,
    );
  }

  const targetType = parsedBody.data.targetType;
  const rawTargetId = parsedBody.data.targetId;

  const targetId =
    targetType === "homework"
      ? typeof rawTargetId === "string"
        ? rawTargetId.trim()
        : null
      : parseOptionalInt(rawTargetId);

  if (!targetId) {
    return badRequest("Invalid target");
  }

  const content = parsedBody.data.content.trim();

  const userId = await resolveApiUserId(request);
  if (!userId) {
    return unauthorized();
  }

  const suspension = await findActiveSuspension(userId);
  if (suspension) {
    return suspensionForbidden(suspension.reason);
  }

  const whereTarget = getTargetWhere(targetType, targetId);
  if (!whereTarget) {
    return badRequest("Invalid target");
  }

  try {
    const target = await ensureTargetExists(targetType, targetId);
    if (!target) {
      return notFound("Target not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.description.findFirst({
        where: whereTarget,
      });
      if (existing && existing.content === content) {
        return { id: existing.id, updated: false };
      }

      const description = existing
        ? await tx.description.update({
            where: { id: existing.id },
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
            },
          })
        : await tx.description.create({
            data: {
              content,
              lastEditedAt: new Date(),
              lastEditedById: userId,
              ...whereTarget,
            },
          });

      await tx.descriptionEdit.create({
        data: {
          descriptionId: description.id,
          editorId: userId,
          previousContent: existing?.content ?? null,
          nextContent: content,
        },
      });

      return { id: description.id, updated: true };
    });

    if (result.updated) {
      writeAuditLog({
        action: "description_edit",
        userId,
        targetId: result.id,
        targetType: "description",
        metadata: { targetType, content: content.slice(0, 200) },
        ipAddress:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      }).catch(() => {});
    }

    return jsonResponse({ id: result.id, updated: result.updated });
  } catch (error) {
    return handleRouteError("Failed to update description", error);
  }
}
