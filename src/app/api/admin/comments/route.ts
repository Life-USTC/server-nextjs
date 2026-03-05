import { NextResponse } from "next/server";
import type { CommentStatus, Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-utils";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
  unauthorized,
} from "@/lib/api/helpers";
import { adminCommentsQuerySchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["active", "softbanned", "deleted"] as const;
const TARGET_TYPE_FILTERS = [
  "course",
  "teacher",
  "section",
  "homework",
  "sectionTeacher",
] as const;

type TargetTypeFilter = (typeof TARGET_TYPE_FILTERS)[number];

function buildTargetTypeWhere(
  targetType: TargetTypeFilter | undefined,
): Prisma.CommentWhereInput {
  if (!targetType) return {};
  switch (targetType) {
    case "course":
      return { courseId: { not: null }, sectionId: null, teacherId: null };
    case "teacher":
      return {
        teacherId: { not: null },
        sectionTeacherId: null,
        homeworkId: null,
      };
    case "section":
      return {
        sectionId: { not: null },
        sectionTeacherId: null,
        homeworkId: null,
      };
    case "homework":
      return { homeworkId: { not: null } };
    case "sectionTeacher":
      return { sectionTeacherId: { not: null } };
    default:
      return {};
  }
}

const COMMENT_INCLUDE = {
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
} satisfies Prisma.CommentInclude;

/**
 * List moderation comments.
 * @params adminCommentsQuerySchema
 * @response adminCommentsPaginatedResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = adminCommentsQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    targetType: searchParams.get("targetType") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return handleRouteError("Invalid moderation query", parsedQuery.error, 400);
  }

  const status = parsedQuery.data.status;
  const targetType = parsedQuery.data.targetType as
    | TargetTypeFilter
    | undefined;

  const pagination = getPagination(searchParams);

  const statusWhere: Prisma.CommentWhereInput = STATUS_FILTERS.includes(
    status as (typeof STATUS_FILTERS)[number],
  )
    ? { status: status as CommentStatus }
    : {};

  const targetTypeWhere = buildTargetTypeWhere(targetType);

  const where: Prisma.CommentWhereInput = {
    ...statusWhere,
    ...targetTypeWhere,
  };

  try {
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: COMMENT_INCLUDE,
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(
        comments,
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch moderation queue", error);
  }
}
