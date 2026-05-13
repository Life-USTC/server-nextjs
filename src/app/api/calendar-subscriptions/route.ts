import { replaceUserSectionSubscriptions } from "@/features/home/server/subscriptions";
import {
  handleRouteError,
  jsonResponse,
  parseRouteJsonBody,
  unauthorized,
} from "@/lib/api/helpers";
import { calendarSubscriptionCreateRequestSchema } from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * Replace the current user's section subscriptions.
 * @body calendarSubscriptionCreateRequestSchema
 * @response calendarSubscriptionCreateResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return unauthorized();
    }

    const parsedBody = await parseRouteJsonBody(
      request,
      calendarSubscriptionCreateRequestSchema,
      "Invalid subscription request",
    );
    if (parsedBody instanceof Response) {
      return parsedBody;
    }

    const sectionIds = parsedBody.sectionIds ?? [];
    const subscription = await replaceUserSectionSubscriptions(
      userId,
      sectionIds,
    );

    return jsonResponse({
      subscription,
    });
  } catch (error) {
    return handleRouteError("Failed to update calendar subscription", error);
  }
}
