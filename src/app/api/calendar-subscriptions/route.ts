import { auth } from "@/auth";
import {
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import { calendarSubscriptionCreateRequestSchema } from "@/lib/api/schemas/request-schemas";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Replace the current user's section subscriptions.
 * @body calendarSubscriptionCreateRequestSchema
 * @response calendarSubscriptionCreateResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const parsedBody = calendarSubscriptionCreateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError(
        "Invalid subscription request",
        parsedBody.error,
        400,
      );
    }

    const sectionIds = parsedBody.data.sectionIds ?? [];

    const existingSections = await prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true },
    });

    const validSectionIds = existingSections.map((section) => section.id);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscribedSections: {
          set: validSectionIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        subscribedSections: {
          select: { id: true },
        },
      },
    });

    return jsonResponse({
      subscription: {
        userId: updatedUser.id,
        sections: updatedUser.subscribedSections,
      },
    });
  } catch (error) {
    return handleRouteError("Failed to update calendar subscription", error);
  }
}
