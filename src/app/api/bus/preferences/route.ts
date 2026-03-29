import { auth } from "@/auth";
import { saveBusPreference } from "@/features/bus/lib/bus-service";
import {
  handleRouteError,
  jsonResponse,
  unauthorized,
} from "@/lib/api/helpers";
import { busPreferenceRequestSchema } from "@/lib/api/schemas/request-schemas";

export const dynamic = "force-dynamic";

/**
 * Get or update bus preferences for the current user.
 * @body busPreferenceRequestSchema
 * @response busPreferenceResponseSchema
 * @response 401:openApiErrorSchema
 * @response 400:openApiErrorSchema
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
  }

  try {
    const preference = await saveBusPreference(userId, {
      preferredOriginCampusId: null,
      preferredDestinationCampusId: null,
      favoriteCampusIds: [],
      favoriteRouteIds: [],
      showDepartedTrips: false,
    });

    return jsonResponse({ preference });
  } catch (error) {
    return handleRouteError("Failed to fetch bus preferences", error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return unauthorized();
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch (error) {
    return handleRouteError("Invalid bus preference request", error, 400);
  }

  const parsedBody = busPreferenceRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return handleRouteError(
      "Invalid bus preference request",
      parsedBody.error,
      400,
    );
  }

  try {
    const preference = await saveBusPreference(userId, parsedBody.data);
    return jsonResponse({ preference });
  } catch (error) {
    return handleRouteError("Failed to save bus preferences", error);
  }
}
