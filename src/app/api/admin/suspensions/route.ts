import { requireAdmin } from "@/lib/admin-utils";
import {
  handleRouteError,
  jsonResponse,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { adminCreateSuspensionRequestSchema } from "@/lib/api/schemas/request-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/db/prisma";
import { parseDateInput } from "@/lib/time/parse-date-input";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  const parsed = parseDateInput(value);
  return parsed instanceof Date ? parsed : null;
}

/**
 * List suspensions.
 * @response adminSuspensionsResponseSchema
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
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

    return jsonResponse({ suspensions });
  } catch (error) {
    return handleRouteError("Failed to fetch suspensions", error);
  }
}

/**
 * Create suspension for one user.
 * @body adminCreateSuspensionRequestSchema
 * @response adminSuspensionResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
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
      return notFound("User not found");
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

    writeAuditLog({
      action: "admin_user_suspend",
      userId: admin.userId,
      targetId: userId,
      targetType: "user",
      metadata: { reason: parsedBody.data.reason ?? null },
    }).catch(() => {});

    return jsonResponse({ suspension });
  } catch (error) {
    return handleRouteError("Failed to suspend user", error);
  }
}
