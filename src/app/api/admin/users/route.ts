import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import {
  buildPaginatedResponse,
  getPagination,
  handleRouteError,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const pagination = getPagination(searchParams);
  const search = searchParams.get("search")?.trim() ?? "";

  try {
    const where = search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } },
            {
              verifiedEmails: {
                some: {
                  email: { contains: search, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          isAdmin: true,
          createdAt: true,
          verifiedEmails: {
            select: { email: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          isAdmin: u.isAdmin,
          email: u.verifiedEmails?.[0]?.email ?? null,
          createdAt: u.createdAt.toISOString(),
        })),
        pagination.page,
        pagination.pageSize,
        total,
      ),
    );
  } catch (error) {
    return handleRouteError("Failed to fetch users", error);
  }
}
