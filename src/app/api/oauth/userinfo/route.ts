import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/oauth/userinfo
 *
 * OIDC-compatible userinfo endpoint.
 * Requires a valid Bearer access token with "openid" scope.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const token = authHeader.slice(7);
  const accessToken = await prisma.oAuthAccessToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  if (!accessToken || accessToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const { user } = accessToken;
  const scopes = accessToken.scopes;

  const response: Record<string, unknown> = {
    sub: user.id,
  };

  if (scopes.includes("profile")) {
    response.name = user.name;
    response.preferred_username = user.username;
    response.picture = user.image;
  }

  return NextResponse.json(response);
}
