import { jsonResponse } from "@/lib/api/helpers";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Return the authenticated user's profile.
 * @response meResponseSchema
 * @response 401:openApiErrorSchema
 */
export async function GET(request: Request) {
  const userId = await resolveApiUserId(request);
  if (!userId) {
    return jsonResponse({ error: "Not authenticated" }, { status: 401 });
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
    return jsonResponse({ error: "User not found" }, { status: 404 });
  }

  return jsonResponse(user);
}
