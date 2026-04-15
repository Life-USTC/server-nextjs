import { getUserCalendarSubscription } from "@/features/home/server/subscriptions";
import { handleRouteError, jsonResponse } from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * Get the current user's section subscriptions.
 * @response currentCalendarSubscriptionResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return handleRouteError("Unauthorized", new Error("Unauthorized"), 401);
    }

    const subscription = await getUserCalendarSubscription(userId);

    if (!subscription) {
      return jsonResponse({ subscription: null });
    }

    return jsonResponse({ subscription });
  } catch (error) {
    return handleRouteError("Failed to fetch calendar subscription", error);
  }
}
