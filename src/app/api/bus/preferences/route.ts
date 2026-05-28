import {
  getBusPreference,
  saveBusPreference,
} from "@/features/bus/lib/bus-service";
import {
  handleRouteError,
  jsonResponse,
  parseRouteJsonBody,
} from "@/lib/api/helpers";
import { busPreferenceRequestSchema } from "@/lib/api/schemas/request-schemas";
import { requireAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

/**
 * Get bus preferences for the current user.
 * @response busPreferenceResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  try {
    const preference = await getBusPreference(userId);
    return jsonResponse({ preference });
  } catch (error) {
    return handleRouteError("Failed to fetch bus preferences", error);
  }
}

/**
 * Update bus preferences for the current user.
 * @body busPreferenceRequestSchema
 * @response busPreferenceResponseSchema
 * @response 401:openApiErrorSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  const parsedBody = await parseRouteJsonBody(
    request,
    busPreferenceRequestSchema,
    "Invalid bus preference request",
  );
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  try {
    const preference = await saveBusPreference(userId, parsedBody);
    return jsonResponse({ preference });
  } catch (error) {
    return handleRouteError("Failed to save bus preferences", error);
  }
}
