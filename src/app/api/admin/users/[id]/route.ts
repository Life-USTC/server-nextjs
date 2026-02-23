import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { badRequest, handleRouteError, unauthorized } from "@/lib/api-helpers";
import {
  adminUpdateUserRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api-schemas/request-schemas";
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

async function parseUserId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid user ID");
  }

  return parsed.data.id;
}

/**
 * Update one user.
 * @pathParams resourceIdPathParamsSchema
 * @body adminUpdateUserRequestSchema
 * @response adminUserResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const parsed = await parseUserId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;
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
          return badRequest("Invalid username");
        }
        const existing = await prisma.user.findUnique({
          where: { username },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          return badRequest("Username already taken");
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
