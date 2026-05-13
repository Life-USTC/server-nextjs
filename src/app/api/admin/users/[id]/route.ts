import { NextResponse } from "next/server";
import { withAdminRoute } from "@/lib/admin-utils";
import {
  badRequest,
  jsonResponse,
  parseRouteInput,
  parseRouteJsonBody,
} from "@/lib/api/helpers";
import {
  adminUpdateUserRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function normalizeName(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || "";
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
  const parsed = parseRouteInput(
    raw,
    resourceIdPathParamsSchema,
    "Invalid user ID",
  );
  if (parsed instanceof Response) {
    return badRequest("Invalid user ID");
  }

  return parsed.id;
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
  return withAdminRoute("Failed to update user", async () => {
    const parsed = await parseUserId(params);
    if (parsed instanceof NextResponse) {
      return parsed;
    }
    const id = parsed;
    const parsedBody = await parseRouteJsonBody(
      request,
      adminUpdateUserRequestSchema,
      "Invalid update request",
    );
    if (parsedBody instanceof Response) {
      return parsedBody;
    }

    const data: {
      name?: string;
      username?: string | null;
      isAdmin?: boolean;
    } = {};

    if ("name" in parsedBody) {
      data.name = normalizeName(parsedBody.name);
    }

    if ("username" in parsedBody) {
      const username = normalizeUsername(parsedBody.username);
      if (username) {
        if (!/^[a-z0-9-]{1,20}$/.test(username)) {
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

    if ("isAdmin" in parsedBody && typeof parsedBody.isAdmin === "boolean") {
      data.isAdmin = parsedBody.isAdmin;
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

    return jsonResponse({
      user: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        isAdmin: updated.isAdmin,
        email: email?.email ?? null,
        createdAt: updated.createdAt,
      },
    });
  });
}
