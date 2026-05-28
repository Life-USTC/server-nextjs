import { withAdminRoute } from "@/lib/admin-utils";
import {
  jsonResponse,
  notFound,
  parseResourceIdParam,
} from "@/lib/api/helpers";
import { fireAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Lift one suspension.
 * @pathParams resourceIdPathParamsSchema
 * @response adminSuspensionResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdminRoute("Failed to lift suspension", async (admin) => {
    const parsed = await parseResourceIdParam(params, "suspension");
    if (parsed instanceof Response) {
      return parsed;
    }
    const id = parsed;

    const existing = await prisma.userSuspension.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return notFound();
    }

    const suspension = await prisma.userSuspension.update({
      where: { id },
      data: {
        liftedAt: new Date(),
        liftedById: admin.userId,
      },
    });

    fireAuditLog({
      action: "admin_user_unsuspend",
      userId: admin.userId,
      targetId: suspension.userId,
      targetType: "user",
      metadata: { suspensionId: id },
    });

    return jsonResponse({ suspension });
  });
}
