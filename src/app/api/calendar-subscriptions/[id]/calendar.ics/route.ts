import { redirect } from "next/navigation";
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

  const sectionIds = subscription.sections.map((s) => s.id).join(",");

  redirect(`/api/sections/calendar.ics?sectionIds=${sectionIds}`);
}
