import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { badRequest, handleRouteError, unauthorized } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function verifyClientSecret(plain: string, stored: string): boolean {
  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(plain), Buffer.from(stored));
  } catch {
    return false;
  }
}

function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  if (method === "S256") {
    const digest = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    return digest === codeChallenge;
  }
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }
  return false;
}

/**
 * OAuth 2.0 token endpoint.
 * Supports grant_type=authorization_code with optional PKCE.
 * @response 200:{ access_token, token_type, expires_in?, scope }
 * @response 400:openApiErrorSchema
 * @response 401:openApiErrorSchema
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, string>;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      body = await request.json();
    }

    const {
      grant_type,
      code,
      redirect_uri,
      code_verifier,
      client_id,
      client_secret,
    } = body;

    if (grant_type !== "authorization_code") {
      return badRequest("Unsupported grant_type");
    }

    if (!code || !redirect_uri || !client_id) {
      return badRequest("Missing required parameters");
    }

    // Look up client
    const oauthClient = await prisma.oAuthClient.findUnique({
      where: { clientId: client_id },
      select: {
        id: true,
        clientSecret: true,
        redirectUris: true,
        isActive: true,
      },
    });

    if (!oauthClient || !oauthClient.isActive) {
      return unauthorized("Invalid client");
    }

    // Verify client secret (if provided – public clients using PKCE may omit it)
    if (client_secret) {
      if (!verifyClientSecret(client_secret, oauthClient.clientSecret)) {
        return unauthorized("Invalid client credentials");
      }
    }

    // Look up authorization code
    const authCode = await prisma.oAuthAuthorizationCode.findUnique({
      where: { code },
      select: {
        id: true,
        expiresAt: true,
        used: true,
        redirectUri: true,
        scopes: true,
        codeChallenge: true,
        codeChallengeMethod: true,
        oauthClientId: true,
        userId: true,
      },
    });

    if (!authCode) {
      return badRequest("Invalid authorization code");
    }

    if (authCode.used) {
      return badRequest("Authorization code already used");
    }

    if (authCode.expiresAt < new Date()) {
      return badRequest("Authorization code expired");
    }

    if (authCode.oauthClientId !== oauthClient.id) {
      return badRequest("Authorization code was not issued for this client");
    }

    if (authCode.redirectUri !== redirect_uri) {
      return badRequest("redirect_uri mismatch");
    }

    // Verify PKCE if code_challenge was set
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        return badRequest("code_verifier required");
      }
      const method = authCode.codeChallengeMethod ?? "plain";
      if (!verifyPkceChallenge(code_verifier, authCode.codeChallenge, method)) {
        return badRequest("Invalid code_verifier");
      }
    }

    // Mark code as used
    await prisma.oAuthAuthorizationCode.update({
      where: { id: authCode.id },
      data: { used: true },
    });

    // Issue access token
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.oAuthAccessToken.create({
      data: {
        token,
        expiresAt,
        scopes: authCode.scopes,
        oauthClientId: oauthClient.id,
        userId: authCode.userId,
      },
    });

    return NextResponse.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: authCode.scopes.join(" "),
    });
  } catch (error) {
    return handleRouteError("Failed to process token request", error);
  }
}
