import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  ACCESS_TOKEN_LIFETIME_MS,
  generateToken,
  hashOAuthRefreshToken,
  OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
  OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
  REFRESH_TOKEN_LIFETIME_MS,
  verifyOAuthClientSecret,
  verifyPkceCodeVerifier,
} from "@/lib/oauth/utils";

type TokenParams = Record<string, string>;
type OAuthClientRecord = {
  id: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  grantTypes: string[];
};
type RequestClientAuthMethod =
  | typeof OAUTH_PUBLIC_CLIENT_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_POST_AUTH_METHOD;

/**
 * POST /api/oauth/token
 *
 * OAuth 2.0 token endpoint.
 * Supports grant_type=authorization_code and grant_type=refresh_token.
 *
 * Accepts either JSON or application/x-www-form-urlencoded bodies,
 * and also supports HTTP Basic auth for client credentials.
 */
export async function POST(request: Request) {
  try {
    const parsedParams = await parseTokenParams(request);
    if ("error" in parsedParams) {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_request_body",
        status: 400,
        reason: "token request body could not be parsed",
      });
      return errorResponse("invalid_request", 400);
    }

    const authenticatedClient = await authenticateClient(request, parsedParams);
    if ("error" in authenticatedClient) {
      return authenticatedClient.response;
    }

    const grantType = parsedParams.grant_type;

    if (grantType === "authorization_code") {
      return exchangeAuthorizationCode({
        client: authenticatedClient.client,
        params: parsedParams,
      });
    }

    if (grantType === "refresh_token") {
      return exchangeRefreshToken({
        client: authenticatedClient.client,
        params: parsedParams,
      });
    }

    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "unsupported_grant_type",
      status: 400,
      reason: "unsupported grant_type requested",
      grantType: grantType ?? null,
      clientId: parsedParams.client_id ?? null,
    });
    return errorResponse("unsupported_grant_type", 400);
  } catch (error) {
    logOAuthEvent(
      "error",
      {
        route: "/api/oauth/token",
        event: "token_exchange_failed",
        status: 500,
        reason: "unexpected error while handling token request",
      },
      error,
    );
    return errorResponse("server_error", 500);
  }
}

async function parseTokenParams(
  request: Request,
): Promise<TokenParams | { error: true }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return { error: true };
    }
  }

  try {
    const formData = await request.formData();
    return Object.fromEntries(
      [...formData.entries()].map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return { error: true };
  }
}

async function authenticateClient(
  request: Request,
  params: TokenParams,
): Promise<
  | {
      client: OAuthClientRecord;
      clientId: string;
      clientSecret: string | undefined;
      usedBasicAuth: boolean;
      requestAuthMethod: RequestClientAuthMethod;
    }
  | { error: true; response: NextResponse }
> {
  let clientId = params.client_id;
  let clientSecret = params.client_secret;
  let usedBasicAuth = false;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
      const colonIndex = decoded.indexOf(":");
      if (colonIndex !== -1) {
        clientId = decodeURIComponent(decoded.slice(0, colonIndex));
        clientSecret = decodeURIComponent(decoded.slice(colonIndex + 1));
        usedBasicAuth = true;
      }
    } catch {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_client_auth",
        status: 401,
        reason: "malformed basic authorization header",
        requestAuthMethod: OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
      });
      return { error: true, response: errorResponse("invalid_client", 401) };
    }
  }

  const requestAuthMethod: RequestClientAuthMethod = usedBasicAuth
    ? OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD
    : clientSecret
      ? OAUTH_CLIENT_SECRET_POST_AUTH_METHOD
      : OAUTH_PUBLIC_CLIENT_AUTH_METHOD;

  if (!clientId) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason: "missing client_id",
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: {
      id: true,
      clientSecret: true,
      tokenEndpointAuthMethod: true,
      grantTypes: true,
    },
  });

  if (!client) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason: "unknown client_id",
      clientId,
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  if (
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    requestAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD
  ) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason: "public client sent client authentication",
      clientId,
      registeredAuthMethod: client.tokenEndpointAuthMethod,
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  if (
    client.tokenEndpointAuthMethod === OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD &&
    (!usedBasicAuth || params.client_secret)
  ) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason:
        "client_secret_basic client must authenticate with HTTP Basic only",
      clientId,
      registeredAuthMethod: client.tokenEndpointAuthMethod,
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  if (
    client.tokenEndpointAuthMethod === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD &&
    (usedBasicAuth || !params.client_secret)
  ) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason:
        "client_secret_post client must authenticate with request body secret only",
      clientId,
      registeredAuthMethod: client.tokenEndpointAuthMethod,
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  if (
    client.tokenEndpointAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    (!clientSecret || !client.clientSecret)
  ) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_client_auth",
      status: 401,
      reason: "missing client_secret",
      clientId,
      registeredAuthMethod: client.tokenEndpointAuthMethod,
      requestAuthMethod,
    });
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  if (clientSecret && client.clientSecret) {
    const verifiedSecret = await verifyOAuthClientSecret(
      clientSecret,
      client.clientSecret,
    );
    if (!verifiedSecret) {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_client_auth",
        status: 401,
        reason: "client_secret verification failed",
        clientId,
        registeredAuthMethod: client.tokenEndpointAuthMethod,
        requestAuthMethod,
      });
      return { error: true, response: errorResponse("invalid_client", 401) };
    }
  }

  return {
    client,
    clientId,
    clientSecret,
    usedBasicAuth,
    requestAuthMethod,
  };
}

async function exchangeAuthorizationCode({
  client,
  params,
}: {
  client: OAuthClientRecord;
  params: TokenParams;
}) {
  if (!client.grantTypes.includes("authorization_code")) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "unauthorized_grant_type",
      status: 400,
      reason: "client is not registered for authorization_code",
      grantType: "authorization_code",
    });
    return errorResponse("unauthorized_client", 400);
  }

  const code = params.code;
  const redirectUri = params.redirect_uri;
  const codeVerifier = params.code_verifier;
  const resource = params.resource;

  if (!code || !redirectUri) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant_request",
      status: 400,
      reason: "missing code or redirect_uri",
      grantType: "authorization_code",
      clientId: params.client_id,
      redirectUri,
      resource,
    });
    return errorResponse("invalid_request", 400);
  }

  const oauthCode = await prisma.oAuthCode.findUnique({
    where: { code },
  });

  if (!oauthCode || oauthCode.clientId !== client.id) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "authorization code not found for client",
      grantType: "authorization_code",
      clientId: params.client_id,
      redirectUri,
      resource,
    });
    return errorResponse("invalid_grant", 400);
  }

  const now = new Date();

  if (oauthCode.expiresAt < now) {
    await prisma.oAuthCode.deleteMany({ where: { id: oauthCode.id } });
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "authorization code expired",
      grantType: "authorization_code",
      clientId: params.client_id,
      redirectUri,
    });
    return errorResponse("invalid_grant", 400);
  }

  if (oauthCode.redirectUri !== redirectUri) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "redirect_uri mismatch",
      grantType: "authorization_code",
      clientId: params.client_id,
      redirectUri,
    });
    return errorResponse("invalid_grant", 400);
  }

  if (oauthCode.resource && resource && oauthCode.resource !== resource) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_target",
      status: 400,
      reason: "resource mismatch",
      grantType: "authorization_code",
      clientId: params.client_id,
      redirectUri,
      resource,
    });
    return errorResponse("invalid_target", 400);
  }

  const isPublicClient =
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD;

  if (oauthCode.codeChallenge) {
    if (!codeVerifier) {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_grant_request",
        status: 400,
        reason: "missing code_verifier for PKCE code",
        grantType: "authorization_code",
        clientId: params.client_id,
      });
      return errorResponse("invalid_request", 400);
    }

    const isValidVerifier = verifyPkceCodeVerifier({
      codeChallenge: oauthCode.codeChallenge,
      codeChallengeMethod: oauthCode.codeChallengeMethod ?? "",
      codeVerifier,
    });

    if (!isValidVerifier) {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_grant",
        status: 400,
        reason: "PKCE verification failed",
        grantType: "authorization_code",
        clientId: params.client_id,
      });
      return errorResponse("invalid_grant", 400);
    }
  } else if (isPublicClient) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "public client attempted non-PKCE code exchange",
      grantType: "authorization_code",
      clientId: params.client_id,
    });
    return errorResponse("invalid_grant", 400);
  }

  const accessToken = generateToken();
  const refreshToken = client.grantTypes.includes("refresh_token")
    ? generateToken()
    : null;
  const expiresIn = Math.floor(ACCESS_TOKEN_LIFETIME_MS / 1000);
  const consumed = await prisma.$transaction(async (tx) => {
    const deleted = await tx.oAuthCode.deleteMany({
      where: {
        id: oauthCode.id,
        clientId: client.id,
        redirectUri,
        expiresAt: { gte: now },
      },
    });

    if (deleted.count !== 1) {
      return false;
    }

    await tx.oAuthAccessToken.create({
      data: {
        token: accessToken,
        scopes: oauthCode.scopes,
        resource: oauthCode.resource,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
        clientId: client.id,
        userId: oauthCode.userId,
      },
    });

    if (refreshToken) {
      await tx.oAuthRefreshToken.create({
        data: {
          tokenHash: hashOAuthRefreshToken(refreshToken),
          scopes: oauthCode.scopes,
          resource: oauthCode.resource,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
          clientId: client.id,
          userId: oauthCode.userId,
        },
      });
    }

    return true;
  });

  if (!consumed) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "authorization code was already consumed",
      grantType: "authorization_code",
      clientId: params.client_id,
    });
    return errorResponse("invalid_grant", 400);
  }

  return buildTokenSuccessResponse({
    accessToken,
    refreshToken,
    expiresIn,
    scopes: oauthCode.scopes,
  });
}

async function exchangeRefreshToken({
  client,
  params,
}: {
  client: OAuthClientRecord;
  params: TokenParams;
}) {
  if (!client.grantTypes.includes("refresh_token")) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "unauthorized_grant_type",
      status: 400,
      reason: "client is not registered for refresh_token",
      grantType: "refresh_token",
      clientId: params.client_id,
    });
    return errorResponse("unauthorized_client", 400);
  }

  const refreshToken = params.refresh_token;
  if (!refreshToken) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant_request",
      status: 400,
      reason: "missing refresh_token",
      grantType: "refresh_token",
      clientId: params.client_id,
    });
    return errorResponse("invalid_request", 400);
  }

  const refreshTokenRecord = await prisma.oAuthRefreshToken.findUnique({
    where: {
      tokenHash: hashOAuthRefreshToken(refreshToken),
    },
  });

  if (!refreshTokenRecord || refreshTokenRecord.clientId !== client.id) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "refresh token not found for client",
      grantType: "refresh_token",
      clientId: params.client_id,
      resource: params.resource,
    });
    return errorResponse("invalid_grant", 400);
  }

  const now = new Date();

  if (refreshTokenRecord.expiresAt < now) {
    await prisma.oAuthRefreshToken.deleteMany({
      where: { id: refreshTokenRecord.id },
    });
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "refresh token expired",
      grantType: "refresh_token",
      clientId: params.client_id,
    });
    return errorResponse("invalid_grant", 400);
  }

  const requestedScopes = params.scope?.split(" ").filter(Boolean) ?? [];
  if (
    requestedScopes.length > 0 &&
    requestedScopes.some((scope) => !refreshTokenRecord.scopes.includes(scope))
  ) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_scope",
      status: 400,
      reason: "requested scopes exceed refresh token scopes",
      grantType: "refresh_token",
      clientId: params.client_id,
      scope: requestedScopes,
    });
    return errorResponse("invalid_scope", 400);
  }

  const resource = params.resource;
  if (resource && resource !== refreshTokenRecord.resource) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_target",
      status: 400,
      reason: "refresh token resource mismatch",
      grantType: "refresh_token",
      clientId: params.client_id,
      resource,
    });
    return errorResponse("invalid_target", 400);
  }

  const grantedScopes =
    requestedScopes.length > 0 ? requestedScopes : refreshTokenRecord.scopes;
  const nextAccessToken = generateToken();
  const nextRefreshToken = generateToken();
  const expiresIn = Math.floor(ACCESS_TOKEN_LIFETIME_MS / 1000);
  const rotated = await prisma.$transaction(async (tx) => {
    const deleted = await tx.oAuthRefreshToken.deleteMany({
      where: {
        id: refreshTokenRecord.id,
        clientId: client.id,
        tokenHash: refreshTokenRecord.tokenHash,
        expiresAt: { gte: now },
      },
    });

    if (deleted.count !== 1) {
      return false;
    }

    await tx.oAuthAccessToken.create({
      data: {
        token: nextAccessToken,
        scopes: grantedScopes,
        resource: refreshTokenRecord.resource,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_LIFETIME_MS),
        clientId: client.id,
        userId: refreshTokenRecord.userId,
      },
    });

    await tx.oAuthRefreshToken.create({
      data: {
        tokenHash: hashOAuthRefreshToken(nextRefreshToken),
        scopes: grantedScopes,
        resource: refreshTokenRecord.resource,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
        clientId: client.id,
        userId: refreshTokenRecord.userId,
      },
    });

    return true;
  });

  if (!rotated) {
    logOAuthEvent("warn", {
      route: "/api/oauth/token",
      event: "invalid_grant",
      status: 400,
      reason: "refresh token was already consumed",
      grantType: "refresh_token",
      clientId: params.client_id,
    });
    return errorResponse("invalid_grant", 400);
  }

  return buildTokenSuccessResponse({
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    expiresIn,
    scopes: grantedScopes,
  });
}

function buildTokenSuccessResponse({
  accessToken,
  refreshToken,
  expiresIn,
  scopes,
}: {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scopes: string[];
}) {
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      scope: scopes.join(" "),
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
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
