import { NextResponse } from "next/server";
import {
  buildTrustedAuthUrl,
  getTrustedAuthOrigin,
} from "@/lib/auth/trusted-origin";
import { prisma } from "@/lib/db/prisma";
import { resolveOAuthClient } from "@/lib/oauth/client-resolver";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  deleteResourceBinding,
  getAccessTokenResourceBindingIdentifier,
  getCodeResourceBindingIdentifier,
  getRefreshTokenResourceBindingIdentifier,
  getResourceBinding,
  parseAndNormalizeResource,
  resourcesEqual,
  setResourceBinding,
} from "@/lib/oauth/resource-binding";
import {
  OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

type TokenParams = Record<string, string>;
type RefreshTokenContext = { scopes: string[] } | null;

/**
 * POST /api/oauth/token
 *
 * Compatibility token endpoint.
 * Delegates token exchange to Better Auth OIDC provider, while preserving
 * legacy resource-bound token behavior required by MCP clients.
 */
export async function POST(request: Request) {
  try {
    const params = await parseTokenParams(request);
    if (!params) {
      logOAuthEvent("warn", {
        route: "/api/oauth/token",
        event: "invalid_request_body",
        status: 400,
        reason: "token request body could not be parsed",
      });
      return errorResponse("invalid_request", 400);
    }

    const clientAuthError = await validateTokenClientAuthentication(
      request,
      params,
    );
    if (clientAuthError) {
      return clientAuthError;
    }

    const refreshTokenContext = await loadRefreshTokenContext(params);

    const validatedResource = await validateAndResolveResourceBinding(params);
    if ("error" in validatedResource) {
      return errorResponse(validatedResource.error, validatedResource.status);
    }

    const upstreamResponse = await exchangeWithBetterAuth(request, params);
    const upstreamPayload = (await upstreamResponse
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    if (!upstreamResponse.ok || !upstreamPayload) {
      return NextResponse.json(upstreamPayload ?? { error: "server_error" }, {
        status: upstreamResponse.status || 500,
      });
    }

    const payloadWithLegacyFields = await addLegacyTokenResponseFields(
      params,
      upstreamPayload,
    );
    const scopedPayloadResult = await applyLegacyRefreshScopeBehavior({
      params,
      payload: payloadWithLegacyFields,
      refreshTokenContext,
    });
    if ("error" in scopedPayloadResult) {
      return errorResponse(
        scopedPayloadResult.error,
        scopedPayloadResult.status,
      );
    }

    await persistResourceBindingsAfterExchange({
      params,
      payload: scopedPayloadResult.payload,
      resource: validatedResource.resource ?? undefined,
    });

    return NextResponse.json(scopedPayloadResult.payload, {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
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

async function parseTokenParams(request: Request): Promise<TokenParams | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return Object.fromEntries(
      [...formData.entries()].map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return null;
  }
}

async function exchangeWithBetterAuth(
  request: Request,
  params: TokenParams,
): Promise<Response> {
  const trustedOrigin = getTrustedAuthOrigin(request);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, value);
  }

  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
  });
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  headers.set("origin", trustedOrigin);
  headers.set("referer", `${trustedOrigin}/`);

  return fetch(buildTrustedAuthUrl("/api/auth/oauth2/token", request), {
    method: "POST",
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });
}

function parseBasicAuthorizationHeader(
  value: string | null,
): { clientId: string; clientSecret: string } | null {
  if (!value?.startsWith("Basic ")) {
    return null;
  }

  const encoded = value.slice("Basic ".length).trim();
  if (!encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex <= 0) {
      return null;
    }
    const clientId = decoded.slice(0, separatorIndex);
    const clientSecret = decoded.slice(separatorIndex + 1);
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

async function validateTokenClientAuthentication(
  request: Request,
  params: TokenParams,
): Promise<NextResponse | null> {
  const authorizationHeader = request.headers.get("authorization");
  const basicAuth = parseBasicAuthorizationHeader(authorizationHeader);
  const clientId = params.client_id ?? basicAuth?.clientId;
  if (!clientId) {
    return null;
  }

  const resolvedClient = await resolveOAuthClient(clientId);
  if ("error" in resolvedClient) {
    return null;
  }

  const hasBasicAuth = Boolean(basicAuth);
  const hasClientSecretInBody = Boolean(params.client_secret);

  if (
    resolvedClient.client.tokenEndpointAuthMethod ===
      OAUTH_CLIENT_SECRET_POST_AUTH_METHOD &&
    (hasBasicAuth || !hasClientSecretInBody)
  ) {
    return errorResponse("invalid_client", 401);
  }

  if (
    resolvedClient.client.tokenEndpointAuthMethod ===
      OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    (hasBasicAuth || hasClientSecretInBody)
  ) {
    return errorResponse("invalid_client", 401);
  }

  return null;
}

async function loadRefreshTokenContext(
  params: TokenParams,
): Promise<RefreshTokenContext> {
  if (params.grant_type !== "refresh_token" || !params.refresh_token) {
    return null;
  }

  const tokenRecord = await prisma.oidcAccessToken.findUnique({
    where: { refreshToken: params.refresh_token },
    select: { scopes: true },
  });
  if (!tokenRecord) {
    return null;
  }
  return {
    scopes: tokenRecord.scopes.split(" ").filter(Boolean),
  };
}

async function addLegacyTokenResponseFields(
  params: TokenParams,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (
    params.grant_type !== "authorization_code" ||
    typeof payload.refresh_token === "string"
  ) {
    return payload;
  }

  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;
  if (!accessToken) {
    return payload;
  }

  const tokenRecord = await prisma.oidcAccessToken.findUnique({
    where: { accessToken },
    select: {
      refreshToken: true,
      client: {
        select: {
          type: true,
        },
      },
    },
  });
  if (!tokenRecord || tokenRecord.client.type === "public") {
    return payload;
  }

  return {
    ...payload,
    refresh_token: tokenRecord.refreshToken,
  };
}

async function applyLegacyRefreshScopeBehavior({
  params,
  payload,
  refreshTokenContext,
}: {
  params: TokenParams;
  payload: Record<string, unknown>;
  refreshTokenContext: RefreshTokenContext;
}): Promise<
  | { payload: Record<string, unknown> }
  | { error: "invalid_scope"; status: number }
> {
  if (params.grant_type !== "refresh_token" || !params.scope) {
    return { payload };
  }

  const requestedScopes = [...new Set(params.scope.split(" ").filter(Boolean))];
  if (requestedScopes.length === 0) {
    return { payload };
  }

  const currentScopes =
    refreshTokenContext?.scopes ??
    (typeof payload.scope === "string"
      ? payload.scope.split(" ").filter(Boolean)
      : []);

  const hasOutOfScopeRequest = requestedScopes.some(
    (scope) => !currentScopes.includes(scope),
  );
  if (hasOutOfScopeRequest) {
    return { error: "invalid_scope", status: 400 };
  }

  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;
  if (accessToken) {
    await prisma.oidcAccessToken.updateMany({
      where: { accessToken },
      data: { scopes: requestedScopes.join(" ") },
    });
  }

  return {
    payload: {
      ...payload,
      scope: requestedScopes.join(" "),
    },
  };
}

async function validateAndResolveResourceBinding(
  params: TokenParams,
): Promise<
  | { resource: string | null }
  | { error: "invalid_target" | "invalid_request"; status: number }
> {
  const grantType = params.grant_type;
  const requestedResourceRaw = params.resource;
  let requestedResource: string | null;
  try {
    requestedResource = requestedResourceRaw
      ? parseAndNormalizeResource(requestedResourceRaw)
      : null;
  } catch {
    return { error: "invalid_target", status: 400 };
  }

  if (grantType === "authorization_code") {
    const code = params.code;
    if (!code) {
      return { resource: null };
    }
    const binding = await getResourceBinding(
      getCodeResourceBindingIdentifier(code),
    );
    if (!binding && requestedResource) {
      return { error: "invalid_target", status: 400 };
    }
    if (binding && !requestedResource) {
      return { error: "invalid_target", status: 400 };
    }
    if (
      binding &&
      requestedResource &&
      !resourcesEqual(binding.resource, requestedResource)
    ) {
      return { error: "invalid_target", status: 400 };
    }
    return { resource: binding?.resource ?? null };
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.refresh_token;
    if (!refreshToken) {
      return { error: "invalid_request", status: 400 };
    }
    const binding = await getResourceBinding(
      getRefreshTokenResourceBindingIdentifier(refreshToken),
    );
    if (!binding && requestedResource) {
      return { error: "invalid_target", status: 400 };
    }
    if (binding && !requestedResource) {
      return { error: "invalid_target", status: 400 };
    }
    if (
      binding &&
      requestedResource &&
      !resourcesEqual(binding.resource, requestedResource)
    ) {
      return { error: "invalid_target", status: 400 };
    }
    return { resource: binding?.resource ?? null };
  }

  return { resource: requestedResource };
}

async function persistResourceBindingsAfterExchange({
  params,
  payload,
  resource,
}: {
  params: TokenParams;
  payload: Record<string, unknown>;
  resource?: string;
}) {
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;
  const refreshToken =
    typeof payload.refresh_token === "string" ? payload.refresh_token : null;
  const expiresIn =
    typeof payload.expires_in === "number" &&
    Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;

  if (!resource || !accessToken) {
    return;
  }

  await setResourceBinding({
    identifier: getAccessTokenResourceBindingIdentifier(accessToken),
    resource,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  });

  if (params.grant_type === "authorization_code") {
    const code = params.code;
    if (code) {
      await deleteResourceBinding(getCodeResourceBindingIdentifier(code));
    }
  }

  if (params.grant_type === "refresh_token") {
    const prevRefreshToken = params.refresh_token;
    if (prevRefreshToken) {
      await deleteResourceBinding(
        getRefreshTokenResourceBindingIdentifier(prevRefreshToken),
      );
    }
  }

  if (refreshToken) {
    await setResourceBinding({
      identifier: getRefreshTokenResourceBindingIdentifier(refreshToken),
      resource,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
