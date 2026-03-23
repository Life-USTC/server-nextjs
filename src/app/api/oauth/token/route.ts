import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  ACCESS_TOKEN_LIFETIME_MS,
  generateToken,
  hashOAuthRefreshToken,
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
  const parsedParams = await parseTokenParams(request);
  if ("error" in parsedParams) {
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

  return errorResponse("unsupported_grant_type", 400);
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
      return { error: true, response: errorResponse("invalid_client", 401) };
    }
  }

  if (!clientId) {
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
    return { error: true, response: errorResponse("invalid_client", 401) };
  }

  const isPublicClient =
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD;

  if (isPublicClient) {
    if (usedBasicAuth || clientSecret) {
      return { error: true, response: errorResponse("invalid_client", 401) };
    }
  } else {
    if (!clientSecret || !client.clientSecret) {
      return { error: true, response: errorResponse("invalid_client", 401) };
    }

    const verifiedSecret = await verifyOAuthClientSecret(
      clientSecret,
      client.clientSecret,
    );
    if (!verifiedSecret) {
      return { error: true, response: errorResponse("invalid_client", 401) };
    }
  }

  return { client, clientId, clientSecret, usedBasicAuth };
}

async function exchangeAuthorizationCode({
  client,
  params,
}: {
  client: OAuthClientRecord;
  params: TokenParams;
}) {
  if (!client.grantTypes.includes("authorization_code")) {
    return errorResponse("unauthorized_client", 400);
  }

  const code = params.code;
  const redirectUri = params.redirect_uri;
  const codeVerifier = params.code_verifier;
  const resource = params.resource;

  if (!code || !redirectUri) {
    return errorResponse("invalid_request", 400);
  }

  const oauthCode = await prisma.oAuthCode.findUnique({
    where: { code },
  });

  if (!oauthCode || oauthCode.clientId !== client.id) {
    return errorResponse("invalid_grant", 400);
  }

  const now = new Date();

  if (oauthCode.expiresAt < now) {
    await prisma.oAuthCode.deleteMany({ where: { id: oauthCode.id } });
    return errorResponse("invalid_grant", 400);
  }

  if (oauthCode.redirectUri !== redirectUri) {
    return errorResponse("invalid_grant", 400);
  }

  if (oauthCode.resource && resource && oauthCode.resource !== resource) {
    return errorResponse("invalid_target", 400);
  }

  const isPublicClient =
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD;

  if (oauthCode.codeChallenge) {
    if (!codeVerifier) {
      return errorResponse("invalid_request", 400);
    }

    const isValidVerifier = verifyPkceCodeVerifier({
      codeChallenge: oauthCode.codeChallenge,
      codeChallengeMethod: oauthCode.codeChallengeMethod ?? "",
      codeVerifier,
    });

    if (!isValidVerifier) {
      return errorResponse("invalid_grant", 400);
    }
  } else if (isPublicClient) {
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
    return errorResponse("unauthorized_client", 400);
  }

  const refreshToken = params.refresh_token;
  if (!refreshToken) {
    return errorResponse("invalid_request", 400);
  }

  const refreshTokenRecord = await prisma.oAuthRefreshToken.findUnique({
    where: {
      tokenHash: hashOAuthRefreshToken(refreshToken),
    },
  });

  if (!refreshTokenRecord || refreshTokenRecord.clientId !== client.id) {
    return errorResponse("invalid_grant", 400);
  }

  const now = new Date();

  if (refreshTokenRecord.expiresAt < now) {
    await prisma.oAuthRefreshToken.deleteMany({
      where: { id: refreshTokenRecord.id },
    });
    return errorResponse("invalid_grant", 400);
  }

  const requestedScopes = params.scope?.split(" ").filter(Boolean) ?? [];
  if (
    requestedScopes.length > 0 &&
    requestedScopes.some((scope) => !refreshTokenRecord.scopes.includes(scope))
  ) {
    return errorResponse("invalid_scope", 400);
  }

  const resource = params.resource;
  if (resource && resource !== refreshTokenRecord.resource) {
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
