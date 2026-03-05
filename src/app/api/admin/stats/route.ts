import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError, unauthorized } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Get admin overview statistics.
 * @response adminStatsResponseSchema
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  try {
    const [
      totalUsers,
      activeSuspensions,
      activeComments,
      softbannedComments,
      deletedComments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userSuspension.count({ where: { liftedAt: null } }),
      prisma.comment.count({ where: { status: "active" } }),
      prisma.comment.count({ where: { status: "softbanned" } }),
      prisma.comment.count({ where: { status: "deleted" } }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeSuspensions,
        comments: {
          active: activeComments,
          softbanned: softbannedComments,
          deleted: deletedComments,
          total: activeComments + softbannedComments + deletedComments,
        },
      },
    });
  } catch (error) {
    return handleRouteError("Failed to fetch admin stats", error);
  }
}
