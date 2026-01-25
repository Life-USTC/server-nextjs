import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["active", "softbanned", "deleted"] as const;

const prismaAny = prisma as typeof prisma & { comment: any };

function parseLimit(value: string | null) {
  if (!value) return 50;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const limit = parseLimit(searchParams.get("limit"));

  const where = STATUS_FILTERS.includes(
    status as (typeof STATUS_FILTERS)[number],
  )
    ? { status }
    : {};

  try {
    const comments = await prismaAny.comment.findMany({
      where,
      include: {
        user: true,
        section: true,
        course: true,
        teacher: true,
        sectionTeacher: {
          include: {
            section: { include: { course: true } },
            teacher: true,
          },
        },
        moderatedBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return handleRouteError("Failed to fetch moderation queue", error);
  }
}
