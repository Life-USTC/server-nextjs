import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { handleRouteError } from "@/lib/api-helpers";
import { adminUpdateUserRequestSchema } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";

function normalizeName(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeUsername(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid update request", error, 400);
  }

  const parsedBody = adminUpdateUserRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError("Invalid update request", parsedBody.error, 400);
  }

  try {
    const data: {
      name?: string | null;
      username?: string | null;
      isAdmin?: boolean;
    } = {};

    if ("name" in parsedBody.data) {
      data.name = normalizeName(parsedBody.data.name);
    }

    if ("username" in parsedBody.data) {
      const username = normalizeUsername(parsedBody.data.username);
      if (username) {
        if (!/^[a-z0-9]{1,20}$/.test(username)) {
          return NextResponse.json(
            { error: "Invalid username" },
            { status: 400 },
          );
        }
        const existing = await prisma.user.findUnique({
          where: { username },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 400 },
          );
        }
      }
      data.username = username;
    }

    if (
      "isAdmin" in parsedBody.data &&
      typeof parsedBody.data.isAdmin === "boolean"
    ) {
      data.isAdmin = parsedBody.data.isAdmin;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    const email = await prisma.verifiedEmail.findFirst({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { email: true },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        isAdmin: updated.isAdmin,
        email: email?.email ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError("Failed to update user", error);
  }
}
