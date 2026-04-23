import {
  handleRouteError,
  jsonResponse,
  notFound,
  unauthorized,
} from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Return the authenticated user's profile.
 * @response meResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  try {
    const userId = await resolveApiUserId(request);
    if (!userId) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        username: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    return jsonResponse(user);
  } catch (error) {
    return handleRouteError("Failed to fetch user profile", error);
  }
}
