import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { badRequest, handleRouteError, unauthorized } from "@/lib/api-helpers";
import { resourceIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function parseSuspensionId(
  params: Promise<{ id: string }>,
): Promise<string | NextResponse> {
  const raw = await params;
  const parsed = resourceIdPathParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("Invalid suspension ID");
  }

  return parsed.data.id;
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
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized();
  }

  const parsed = await parseSuspensionId(params);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const id = parsed;

  try {
    const suspension = await prisma.userSuspension.update({
      where: { id },
      data: {
        liftedAt: new Date(),
        liftedById: admin.userId,
      },
    });

    return NextResponse.json({ suspension });
  } catch (error) {
    return handleRouteError("Failed to lift suspension", error);
  }
}
