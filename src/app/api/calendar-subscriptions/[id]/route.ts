import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import {
  extractToken,
  verifyCalendarSubscriptionJWT,
} from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Verify that the request has a valid token for the subscription
 */
async function verifyAccess(
  request: Request,
  subscriptionId: number,
): Promise<NextResponse | null> {
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

  return null; // Access granted
}

/**
 * GET /api/calendar-subscriptions/[id]
 * Get subscription details (requires valid token)
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const subscriptionId = parseInt(id, 10);

    if (Number.isNaN(subscriptionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify access
    const accessError = await verifyAccess(request, subscriptionId);
    if (accessError) return accessError;

    const subscription = await prisma.calendarSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        sections: {
          include: {
            course: true,
            semester: true,
            campus: true,
            schedules: {
              include: {
                room: {
                  include: {
                    building: true,
                  },
                },
                teachers: true,
              },
            },
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

    return NextResponse.json(subscription);
  } catch (error) {
    return handleRouteError("Failed to get calendar subscription", error);
  }
}

/**
 * PATCH /api/calendar-subscriptions/[id]
 * Update subscription sections (requires valid token)
 * Body: { sectionIds: number[] }
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const subscriptionId = parseInt(id, 10);

    if (Number.isNaN(subscriptionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify access
    const accessError = await verifyAccess(request, subscriptionId);
    if (accessError) return accessError;

    const body = await request.json();
    const sectionIds = body.sectionIds as number[];

    if (!Array.isArray(sectionIds)) {
      return NextResponse.json(
        { error: "sectionIds must be an array" },
        { status: 400 },
      );
    }

    // Update subscription
    const subscription = await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: {
        sections: {
          set: sectionIds.map((id) => ({ id })),
        },
      },
      include: {
        sections: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    return handleRouteError("Failed to update calendar subscription", error);
  }
}

/**
 * DELETE /api/calendar-subscriptions/[id]
 * Delete subscription (requires valid token)
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const subscriptionId = parseInt(id, 10);

    if (Number.isNaN(subscriptionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify access
    const accessError = await verifyAccess(request, subscriptionId);
    if (accessError) return accessError;

    await prisma.calendarSubscription.delete({
      where: { id: subscriptionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError("Failed to delete calendar subscription", error);
  }
}
