import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ACCESS_TOKEN_LIFETIME_MS, generateToken } from "@/lib/oauth/utils";

/**
 * POST /api/oauth/token
 *
 * OAuth 2.0 token endpoint.
 * Supports grant_type=authorization_code.
 *
 * Accepts either JSON or application/x-www-form-urlencoded bodies,
 * and also supports HTTP Basic auth for client credentials.
 */
export async function POST(request: Request) {
  let params: Record<string, string>;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      params = await request.json();
    } catch {
      return errorResponse("invalid_request", 400);
    }
  } else {
    const formData = await request.formData();
    params = Object.fromEntries(
      [...formData.entries()].map(([k, v]) => [k, String(v)]),
    );
  }

  // Support client credentials via Basic auth
  let clientId = params.client_id;
  let clientSecret = params.client_secret;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const colonIndex = decoded.indexOf(":");
    if (colonIndex !== -1) {
      clientId = decodeURIComponent(decoded.slice(0, colonIndex));
      clientSecret = decodeURIComponent(decoded.slice(colonIndex + 1));
    }
  }

  if (!clientId || !clientSecret) {
    return errorResponse("invalid_client", 401);
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
  });

  if (!client || client.clientSecret !== clientSecret) {
    return errorResponse("invalid_client", 401);
  }

  const grantType = params.grant_type;

  if (grantType !== "authorization_code") {
    return errorResponse("unsupported_grant_type", 400);
  }

  const code = params.code;
  const redirectUri = params.redirect_uri;

  if (!code) {
    return errorResponse("invalid_request", 400);
  }

  const oauthCode = await prisma.oAuthCode.findUnique({
    where: { code },
  });

  if (!oauthCode || oauthCode.clientId !== client.id) {
    return errorResponse("invalid_grant", 400);
  }

  if (oauthCode.expiresAt < new Date()) {
    await prisma.oAuthCode.delete({ where: { id: oauthCode.id } });
    return errorResponse("invalid_grant", 400);
  }

  if (redirectUri && oauthCode.redirectUri !== redirectUri) {
    return errorResponse("invalid_grant", 400);
  }

  // Delete the used code (single-use)
  await prisma.oAuthCode.delete({ where: { id: oauthCode.id } });

  const accessToken = generateToken();
  const expiresIn = Math.floor(ACCESS_TOKEN_LIFETIME_MS / 1000);

  await prisma.oAuthAccessToken.create({
    data: {
      token: accessToken,
      scopes: oauthCode.scopes,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
      clientId: client.id,
      userId: oauthCode.userId,
    },
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      scope: oauthCode.scopes.join(" "),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
