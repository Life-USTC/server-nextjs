import { NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  parseInteger,
} from "@/lib/api-helpers";
import {
  calendarSubscriptionIdPathParamsSchema,
  calendarSubscriptionUpdateRequestSchema,
} from "@/lib/api-schemas/request-schemas";
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

async function parseSubscriptionId(context: {
  params: Promise<{ id: string }>;
}): Promise<number | NextResponse> {
  const raw = await context.params;
  const parsedParams = calendarSubscriptionIdPathParamsSchema.safeParse(raw);
  if (!parsedParams.success) {
    return invalidParamResponse("ID");
  }

  const { id } = parsedParams.data;
  const subscriptionId = parseInteger(id);
  if (subscriptionId === null) {
    return invalidParamResponse("ID");
  }

  return subscriptionId;
}

/**
 * Get subscription detail.
 * @pathParams calendarSubscriptionIdPathParamsSchema
 * @response calendarSubscriptionSchema
 * @response 404:openApiErrorSchema
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const subscriptionId = await parseSubscriptionId(context);
    if (subscriptionId instanceof NextResponse) return subscriptionId;

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
 * Update sections in one subscription.
 * @pathParams calendarSubscriptionIdPathParamsSchema
 * @body calendarSubscriptionUpdateRequestSchema
 * @response calendarSubscriptionSummarySchema
 * @response 400:openApiErrorSchema
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const subscriptionId = await parseSubscriptionId(context);
    if (subscriptionId instanceof NextResponse) return subscriptionId;

    // Verify access
    const accessError = await verifyAccess(request, subscriptionId);
    if (accessError) return accessError;

    const body = await request.json();
    const parsedBody = calendarSubscriptionUpdateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError(
        "Invalid subscription update payload",
        parsedBody.error,
        400,
      );
    }

    const sectionIds = parsedBody.data.sectionIds;

    // First check if subscription exists
    const existingSubscription = await prisma.calendarSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true },
    });

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    // Verify all section IDs exist
    const existingSections = await prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true },
    });

    const existingSectionIds = existingSections.map((s) => s.id);
    const validSectionIds = sectionIds.filter((id) =>
      existingSectionIds.includes(id),
    );

    // Update subscription with only valid section IDs
    const subscription = await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: {
        sections: {
          set: validSectionIds.map((id) => ({ id })),
        },
      },
      include: {
        sections: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    return handleRouteError("Failed to update calendar subscription", error);
  }
}

/**
 * Delete one subscription.
 * @pathParams calendarSubscriptionIdPathParamsSchema
 * @response successResponseSchema
 * @response 404:openApiErrorSchema
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const subscriptionId = await parseSubscriptionId(context);
    if (subscriptionId instanceof NextResponse) return subscriptionId;

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
