import { auth } from "@/auth";
import { handleRouteError, jsonResponse } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Get the current user's section subscriptions.
 * @response currentCalendarSubscriptionResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return handleRouteError("Unauthorized", new Error("Unauthorized"), 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        subscribedSections: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return jsonResponse({ subscription: null });
    }

    return jsonResponse({
      subscription: {
        userId: user.id,
        sections: user.subscribedSections,
      },
    });
  } catch (error) {
    return handleRouteError("Failed to fetch calendar subscription", error);
  }
}
