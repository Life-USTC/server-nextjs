import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const prismaAny = prisma as typeof prisma & { userSuspension: any };

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const suspensions = await prismaAny.userSuspension.findMany({
      include: {
        user: true,
        createdBy: true,
        liftedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ suspensions });
  } catch (error) {
    return handleRouteError("Failed to fetch suspensions", error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    userId?: string;
    reason?: string;
    note?: string;
    expiresAt?: string | null;
  } = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid suspension request", error, 400);
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "User required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const suspension = await prismaAny.userSuspension.create({
      data: {
        userId,
        createdById: admin.userId,
        reason: body.reason?.trim() || null,
        note: body.note?.trim() || null,
        expiresAt: parseDate(body.expiresAt ?? null),
      },
    });

    return NextResponse.json({ suspension });
  } catch (error) {
    return handleRouteError("Failed to suspend user", error);
  }
}
