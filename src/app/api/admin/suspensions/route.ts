import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { adminCreateSuspensionRequestSchema } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    const suspensions = await prisma.userSuspension.findMany({
      include: {
        user: {
          select: { id: true, name: true },
        },
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

  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid suspension request", error, 400);
  }

  const parsedBody = adminCreateSuspensionRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid suspension request",
      parsedBody.error,
      400,
    );
  }

  const userId = parsedBody.data.userId.trim();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const suspension = await prisma.userSuspension.create({
      data: {
        userId,
        createdById: admin.userId,
        reason: parsedBody.data.reason?.trim() || null,
        note: parsedBody.data.note?.trim() || null,
        expiresAt: parseDate(parsedBody.data.expiresAt ?? null),
      },
    });

    return NextResponse.json({ suspension });
  } catch (error) {
    return handleRouteError("Failed to suspend user", error);
  }
}
