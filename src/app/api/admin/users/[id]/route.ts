import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import {
  badRequest,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import {
  adminUpdateUserRequestSchema,
  resourceIdPathParamsSchema,
} from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

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
 * Get user details for admin including recent comments and suspensions.
 * @pathParams resourceIdPathParamsSchema
 * @response adminUserDetailResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  _request: Request,
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

  try {
    const [user, recentComments, suspensions] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          username: true,
          isAdmin: true,
          createdAt: true,
          verifiedEmails: { select: { email: true }, take: 1 },
        },
      }),
      prisma.comment.findMany({
        where: { userId: id },
        select: {
          id: true,
          body: true,
          status: true,
          createdAt: true,
          moderationNote: true,
          course: { select: { jwId: true, code: true, nameCn: true } },
          teacher: { select: { id: true, nameCn: true } },
          section: { select: { jwId: true, code: true } },
          homework: {
            select: {
              id: true,
              title: true,
              section: { select: { code: true } },
            },
          },
          sectionTeacher: {
            select: {
              section: { select: { jwId: true, code: true } },
              teacher: { select: { nameCn: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.userSuspension.findMany({
        where: { userId: id },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          liftedAt: true,
          reason: true,
          note: true,
          createdBy: { select: { id: true, name: true } },
          liftedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      return notFound("User not found");
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        isAdmin: user.isAdmin,
        email: user.verifiedEmails?.[0]?.email ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      recentComments: recentComments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      suspensions: suspensions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt?.toISOString() ?? null,
        liftedAt: s.liftedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return handleRouteError("Failed to fetch user details", error);
  }
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
