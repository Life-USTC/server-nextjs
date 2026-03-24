import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getMcpServerUrl } from "@/lib/mcp/urls";
import { resolveOAuthClient } from "@/lib/oauth/client-resolver";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  CODE_LIFETIME_MS,
  generateToken,
  MCP_TOOLS_SCOPE,
  normalizeResourceIndicator,
  OAUTH_CODE_CHALLENGE_METHOD_S256,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
  resourceIndicatorsMatch,
} from "@/lib/oauth/utils";

type AuthorizeRequestBody = {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
};
type RequestedResourceValidationResult =
  | { resource: string | undefined }
  | {
      error: "invalid_request" | "invalid_target";
      errorDescription: string;
    };

function getOptionalString(
  value: FormDataEntryValue | string | null | undefined,
) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function parseAuthorizeBody(
  request: Request,
): Promise<AuthorizeRequestBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as AuthorizeRequestBody;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return {
      client_id: getOptionalString(formData.get("client_id")),
      redirect_uri: getOptionalString(formData.get("redirect_uri")),
      scope: getOptionalString(formData.get("scope")),
      state: getOptionalString(formData.get("state")),
      code_challenge: getOptionalString(formData.get("code_challenge")),
      code_challenge_method: getOptionalString(
        formData.get("code_challenge_method"),
      ),
      resource: getOptionalString(formData.get("resource")),
    };
  }

  const rawBody = await request.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as AuthorizeRequestBody;
  } catch {
    const params = new URLSearchParams(rawBody);
    return {
      client_id: getOptionalString(params.get("client_id")),
      redirect_uri: getOptionalString(params.get("redirect_uri")),
      scope: getOptionalString(params.get("scope")),
      state: getOptionalString(params.get("state")),
      code_challenge: getOptionalString(params.get("code_challenge")),
      code_challenge_method: getOptionalString(
        params.get("code_challenge_method"),
      ),
      resource: getOptionalString(params.get("resource")),
    };
  }
}

function validateRequestedResource({
  request,
  resource,
  scopes,
}: {
  request: Request;
  resource?: string;
  scopes: string[];
}): RequestedResourceValidationResult {
  const mcpServerResource = getMcpServerUrl(request);

  if (!resource) {
    if (scopes.includes(MCP_TOOLS_SCOPE)) {
      return {
        error: "invalid_request",
        errorDescription:
          'resource is required when requesting the "mcp:tools" scope',
      } as const;
    }

    return { resource: undefined } as const;
  }

  let normalizedResource: string;
  try {
    normalizedResource = normalizeResourceIndicator(resource);
  } catch {
    return {
      error: "invalid_target",
      errorDescription:
        "resource must be a valid absolute URI without fragment",
    } as const;
  }

  if (!resourceIndicatorsMatch(normalizedResource, mcpServerResource)) {
    return {
      error: "invalid_target",
      errorDescription:
        "This authorization server only issues resource-bound tokens for its MCP endpoint",
    } as const;
  }

  return { resource: normalizedResource } as const;
}

/**
 * POST /api/oauth/authorize
 *
 * Issues an authorization code after the user consents.
 * Expects a JSON body with: client_id, redirect_uri, scope, state.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "unauthorized_request",
        status: 401,
        reason: "user is not signed in",
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: AuthorizeRequestBody;

    try {
      body = await parseAuthorizeBody(request);
    } catch {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_request",
        status: 400,
        reason: "authorize body could not be parsed",
        userId: session.user.id,
      });
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      resource,
    } = body;

    if (!client_id || !redirect_uri) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_request",
        status: 400,
        reason: "missing client_id or redirect_uri",
        clientId: client_id ?? null,
        redirectUri: redirect_uri ?? null,
        scope: scope ?? null,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const resolvedClient = await resolveOAuthClient(client_id);
    if ("error" in resolvedClient) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_client",
        status: 400,
        reason: resolvedClient.errorDescription,
        clientId: client_id,
        redirectUri: redirect_uri,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "invalid_client" }, { status: 400 });
    }
    const client = resolvedClient.client;

    if (!client.redirectUris.includes(redirect_uri)) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_redirect_uri",
        status: 400,
        reason: "redirect_uri not registered for client",
        clientId: client_id,
        redirectUri: redirect_uri,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "invalid_redirect_uri" },
        { status: 400 },
      );
    }

    const requested = scope?.split(" ").filter(Boolean) ?? client.scopes;
    const scopes = requested.filter((s) => client.scopes.includes(s));

    if (scopes.length === 0) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_scope",
        status: 400,
        reason: "none of the requested scopes are allowed",
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: requested,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: "invalid_scope",
          error_description:
            "None of the requested scopes are allowed for this client",
        },
        { status: 400 },
      );
    }

    const resourceResult = validateRequestedResource({
      request,
      resource,
      scopes,
    });
    if ("error" in resourceResult) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: resourceResult.error,
        status: 400,
        reason: resourceResult.errorDescription,
        clientId: client_id,
        redirectUri: redirect_uri,
        resource: resource ?? null,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: resourceResult.error,
          error_description: resourceResult.errorDescription,
        },
        { status: 400 },
      );
    }

    if (
      client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
      (!code_challenge ||
        code_challenge_method !== OAUTH_CODE_CHALLENGE_METHOD_S256)
    ) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_request",
        status: 400,
        reason: "public client did not provide valid PKCE challenge",
        clientId: client_id,
        redirectUri: redirect_uri,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description:
            "Public clients must provide code_challenge with code_challenge_method=S256",
        },
        { status: 400 },
      );
    }

    if (
      code_challenge_method &&
      code_challenge_method !== OAUTH_CODE_CHALLENGE_METHOD_S256
    ) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_request",
        status: 400,
        reason: "unsupported code_challenge_method",
        clientId: client_id,
        redirectUri: redirect_uri,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Unsupported code_challenge_method",
        },
        { status: 400 },
      );
    }
    const code = generateToken();

    await prisma.oAuthCode.create({
      data: {
        code,
        redirectUri: redirect_uri,
        scopes,
        codeChallenge: code_challenge ?? null,
        codeChallengeMethod: code_challenge_method ?? null,
        resource: resourceResult.resource ?? null,
        expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
        clientId: client.id,
        userId: session.user.id,
      },
    });

    const url = new URL(redirect_uri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);

    return NextResponse.json({ redirect: url.toString() });
  } catch (error) {
    logOAuthEvent(
      "error",
      {
        route: "/api/oauth/authorize",
        event: "authorize_failed",
        status: 500,
        reason: "unexpected error while issuing authorization code",
      },
      error,
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
