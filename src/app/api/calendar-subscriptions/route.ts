import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError } from "@/lib/api-helpers";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/calendar-subscriptions
 * Create a new calendar subscription (requires authentication)
 * Body: { sectionIds?: number[] }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const sectionIds = (body.sectionIds || []) as number[];

    // Create the subscription tied to the user
    const subscription = await prisma.calendarSubscription.create({
      data: {
        sections: {
          connect: sectionIds.map((id) => ({ id })),
        },
        user: {
          connect: { id: session.user.id },
        },
      },
      include: {
        sections: true,
      },
    });

    // Generate JWT token
    const token = await generateCalendarSubscriptionJWT(subscription.id);

    return NextResponse.json({
      subscription,
      token,
    });
  } catch (error) {
    return handleRouteError("Failed to create calendar subscription", error);
  }
}
