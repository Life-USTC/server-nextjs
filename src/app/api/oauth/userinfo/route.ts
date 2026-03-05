import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError, unauthorized } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * OIDC / OAuth 2.0 userinfo endpoint.
 * Requires a valid Bearer access token.
 * Returns the authenticated user's profile.
 * @response 200:{ sub, name?, username?, picture? }
 * @response 401:openApiErrorSchema
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized("Bearer token required");
    }

    const token = authHeader.slice(7);
    const accessToken = await prisma.oAuthAccessToken.findUnique({
      where: { token },
      select: {
        userId: true,
        expiresAt: true,
        scopes: true,
      },
    });

    if (!accessToken) {
      return unauthorized("Invalid access token");
    }

    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      return unauthorized("Access token expired");
    }

    const user = await prisma.user.findUnique({
      where: { id: accessToken.userId },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
    });

    if (!user) {
      return unauthorized("User not found");
    }

    return NextResponse.json({
      sub: user.id,
      name: user.name,
      preferred_username: user.username,
      picture: user.image,
    });
  } catch (error) {
    return handleRouteError("Failed to fetch userinfo", error);
  }
}
