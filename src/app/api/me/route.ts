import { handleRouteError, jsonResponse, notFound } from "@/lib/api/helpers";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Return the authenticated user's profile.
 * @response meResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

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
