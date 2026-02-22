import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get current user's latest calendar subscription.
 * @response currentCalendarSubscriptionResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return handleRouteError("Unauthorized", new Error("Unauthorized"), 401);
    }

    // Find the most recent subscription for this user
    const subscription = await prisma.calendarSubscription.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        id: "desc",
      },
      include: {
        sections: {
          select: { id: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Generate a token for this subscription so the client can use it for updates if needed
    // although mostly they should just use the user session if we updated the API.
    // But for compatibility with existing client code which might send Authorization: Bearer [token]
    // we can return a token.
    const token = await generateCalendarSubscriptionJWT(subscription.id);

    return NextResponse.json({
      subscription,
      token,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch calendar subscription", error);
  }
}
