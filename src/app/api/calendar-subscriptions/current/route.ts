import { getUserCalendarSubscription } from "@/features/home/server/subscription-read-model";
import { handleRouteError, jsonResponse } from "@/lib/api/helpers";
import { requireAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * Get the current user's section subscriptions.
 * @response currentCalendarSubscriptionResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const subscription = await getUserCalendarSubscription(userId);

    if (!subscription) {
      return jsonResponse({ subscription: null });
    }

    return jsonResponse({ subscription });
  } catch (error) {
    return handleRouteError("Failed to fetch calendar subscription", error);
  }
}
