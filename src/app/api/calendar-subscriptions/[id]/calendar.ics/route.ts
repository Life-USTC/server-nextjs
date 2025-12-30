import { type NextRequest, NextResponse } from "next/server";
import {
  extractToken,
  verifyCalendarSubscriptionJWT,
} from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar-subscriptions/[id]/calendar.ics?token=xxx
 * Redirect to batch calendar endpoint with subscription's section IDs
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const subscriptionId = Number.parseInt(id, 10);

    if (Number.isNaN(subscriptionId)) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400 },
      );
    }

    // Extract and verify token
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenSubscriptionId = await verifyCalendarSubscriptionJWT(token);
    if (tokenSubscriptionId !== subscriptionId) {
      return NextResponse.json(
        { error: "Invalid or unauthorized token" },
        { status: 403 },
      );
    }

    // Fetch subscription with sections
    const subscription = await prisma.calendarSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        sections: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if (subscription.sections.length === 0) {
      return NextResponse.json(
        { error: "No sections in subscription" },
        { status: 404 },
      );
    }

    // Build section IDs comma-separated string
    const sectionIds = subscription.sections.map((s) => s.id).join(",");

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/api/sections/calendar.ics";
    redirectUrl.searchParams.set("sectionIds", sectionIds);

    return NextResponse.redirect(redirectUrl, { status: 307 });
  } catch (error) {
    console.error("Error redirecting to subscription calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to generate calendar",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
