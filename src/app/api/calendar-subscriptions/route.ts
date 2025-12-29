import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/calendar-subscriptions
 * Create a new calendar subscription (anonymous)
 * Body: { sectionIds?: number[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sectionIds = (body.sectionIds || []) as number[];

    // Create the subscription
    const subscription = await prisma.calendarSubscription.create({
      data: {
        sections: {
          connect: sectionIds.map((id) => ({ id })),
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
