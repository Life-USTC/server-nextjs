import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { invalidParamResponse, parseInteger } from "@/lib/api-helpers";
import { calendarSubscriptionIdPathParamsSchema } from "@/lib/api-schemas/request-schemas";
import {
  extractToken,
  verifyCalendarSubscriptionJWT,
} from "@/lib/calendar-jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Redirect calendar subscription token to sections ICS URL.
 * @pathParams calendarSubscriptionIdPathParamsSchema
 * @response 302
 * @response 404:openApiErrorSchema
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rawParams = await context.params;
  const parsedParams =
    calendarSubscriptionIdPathParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return invalidParamResponse("subscription ID");
  }

  const { id } = parsedParams.data;
  const subscriptionId = parseInteger(id);

  if (subscriptionId === null) {
    return invalidParamResponse("subscription ID");
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
