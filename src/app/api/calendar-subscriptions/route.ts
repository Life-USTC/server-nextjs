import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleRouteError, unauthorized } from "@/lib/api-helpers";
import { calendarSubscriptionCreateRequestSchema } from "@/lib/api-schemas/request-schemas";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Create a calendar subscription.
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
        sections: {
          select: { id: true },
        },
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
