import { withAdminRoute } from "@/lib/admin-utils";
import { jsonResponse, parseRouteParams } from "@/lib/api/helpers";
import { resourceIdPathParamsSchema } from "@/lib/api/schemas/request-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function parseSuspensionId(
  params: Promise<{ id: string }>,
): Promise<string | Response> {
  const parsed = await parseRouteParams(
    params,
    resourceIdPathParamsSchema,
    "Invalid suspension ID",
  );
  if (parsed instanceof Response) {
    return parsed;
  }

  return parsed.id;
}

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
    const parsed = await parseSuspensionId(params);
    if (parsed instanceof Response) {
      return parsed;
    }
    const id = parsed;
    const suspension = await prisma.userSuspension.update({
      where: { id },
      data: {
        liftedAt: new Date(),
        liftedById: admin.userId,
      },
    });

    writeAuditLog({
      action: "admin_user_unsuspend",
      userId: admin.userId,
      targetId: suspension.userId,
      targetType: "user",
      metadata: { suspensionId: id },
    }).catch(() => {});

    return jsonResponse({ suspension });
  });
}
