import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logOAuthEvent } from "@/lib/oauth/logging";

/**
 * GET /api/oauth/userinfo
 *
 * OIDC-compatible userinfo endpoint.
 * Requires a valid Bearer access token with "openid" scope.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    logOAuthEvent("warn", {
      route: "/api/oauth/userinfo",
      event: "invalid_token",
      status: 401,
      reason: "missing bearer token",
    });
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const token = authHeader.slice(7);
  const accessToken = await prisma.oidcAccessToken.findUnique({
    where: { accessToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!accessToken || accessToken.accessTokenExpiresAt < new Date()) {
    if (accessToken) {
      // Clean up expired token
      await prisma.oidcAccessToken.deleteMany({
        where: { id: accessToken.id },
      });
      logOAuthEvent("warn", {
        route: "/api/oauth/userinfo",
        event: "invalid_token",
        status: 401,
        reason: "expired bearer token",
      });
    } else {
      logOAuthEvent("warn", {
        route: "/api/oauth/userinfo",
        event: "invalid_token",
        status: 401,
        reason: "unknown bearer token",
      });
    }
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const { user } = accessToken;
  if (!user) {
    logOAuthEvent("warn", {
      route: "/api/oauth/userinfo",
      event: "invalid_token",
      status: 401,
      reason: "access token missing user relation",
    });
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }
  const scopes = accessToken.scopes.split(" ").filter(Boolean);

  // OIDC requires the "openid" scope for userinfo access
  if (!scopes.includes("openid")) {
    logOAuthEvent("warn", {
      route: "/api/oauth/userinfo",
      event: "insufficient_scope",
      status: 403,
      reason: "access token missing openid scope",
      scope: scopes,
    });
    return NextResponse.json(
      { error: "insufficient_scope" },
      {
        status: 403,
        headers: {
          "WWW-Authenticate": 'Bearer error="insufficient_scope"',
        },
      },
    );
  }

  const response: Record<string, unknown> = {
    sub: user.id,
  };

  if (scopes.includes("profile")) {
    response.name = user.name;
    response.preferred_username = user.username;
    response.picture = user.image;
  }
  if (scopes.includes("email")) {
    response.email = user.email;
    response.email_verified = user.emailVerified;
  }

  return NextResponse.json(response);
}
