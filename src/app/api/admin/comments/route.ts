import { NextResponse } from "next/server";
import type { CommentStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError, parseOptionalInt } from "@/lib/api-helpers";
import { adminCommentsQuerySchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["active", "softbanned", "deleted"] as const;

function parseLimit(value: string | null) {
  const parsed = parseOptionalInt(value);
  if (!parsed) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

/**
 * List moderation comments.
 * @params adminCommentsQuerySchema
 * @response adminCommentsResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = adminCommentsQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid moderation query", parsedQuery.error, 400);
  }

  const status = parsedQuery.data.status ?? "";
  const limit = parseLimit(parsedQuery.data.limit ?? null);

  const where = STATUS_FILTERS.includes(
    status as (typeof STATUS_FILTERS)[number],
  )
    ? { status: status as CommentStatus }
    : {};

  try {
    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: { name: true },
        },
        section: {
          select: { jwId: true, code: true },
        },
        course: {
          select: { jwId: true, code: true, nameCn: true },
        },
        teacher: {
          select: { id: true, nameCn: true },
        },
        homework: {
          select: {
            id: true,
            title: true,
            section: {
              select: { code: true },
            },
          },
        },
        sectionTeacher: {
          select: {
            section: {
              select: { jwId: true, code: true },
            },
            teacher: {
              select: { nameCn: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return handleRouteError("Failed to fetch moderation queue", error);
  }
}
