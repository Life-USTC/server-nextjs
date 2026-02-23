import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  forbidden,
  handleRouteError,
  invalidParamResponse,
  notFound,
  parseInteger,
  unauthorized,
} from "@/lib/api-helpers";
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

  let sectionIds = "";
  try {
    // Extract and verify token
    const token = extractToken(request);
    if (!token) {
      return unauthorized();
    }

    const tokenSubscriptionId = await verifyCalendarSubscriptionJWT(token);
    if (tokenSubscriptionId !== subscriptionId) {
      return forbidden("Invalid or unauthorized token");
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
      return notFound("Subscription not found");
    }

    if (subscription.sections.length === 0) {
      return notFound("No sections in subscription");
    }

    sectionIds = subscription.sections.map((s) => s.id).join(",");
  } catch (error) {
    return handleRouteError("Failed to resolve calendar subscription", error);
  }

  redirect(`/api/sections/calendar.ics?sectionIds=${sectionIds}`);
}
