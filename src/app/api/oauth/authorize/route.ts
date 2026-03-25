import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildTrustedAuthUrl,
  getTrustedAuthOrigin,
} from "@/lib/auth/trusted-origin";
import { getMcpServerUrl } from "@/lib/mcp/urls";
import { resolveOAuthClient } from "@/lib/oauth/client-resolver";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  getCodeResourceBindingIdentifier,
  parseAndNormalizeResource,
  resourcesEqual,
  setResourceBinding,
} from "@/lib/oauth/resource-binding";
import {
  CODE_LIFETIME_MS,
  MCP_TOOLS_SCOPE,
  OAUTH_CODE_CHALLENGE_METHOD_S256,
} from "@/lib/oauth/utils";

type AuthorizeRequestBody = {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  prompt?: string;
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
      prompt: getOptionalString(formData.get("prompt")),
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
      prompt: getOptionalString(params.get("prompt")),
      code_challenge: getOptionalString(params.get("code_challenge")),
      code_challenge_method: getOptionalString(
        params.get("code_challenge_method"),
      ),
      resource: getOptionalString(params.get("resource")),
    };
  }
}

function parseAuthorizeQuery(request: Request): AuthorizeRequestBody {
  const params = new URL(request.url).searchParams;
  return {
    client_id: getOptionalString(params.get("client_id")),
    redirect_uri: getOptionalString(params.get("redirect_uri")),
    scope: getOptionalString(params.get("scope")),
    state: getOptionalString(params.get("state")),
    prompt: getOptionalString(params.get("prompt")),
    code_challenge: getOptionalString(params.get("code_challenge")),
    code_challenge_method: getOptionalString(
      params.get("code_challenge_method"),
    ),
    resource: getOptionalString(params.get("resource")),
  };
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

  try {
    const normalizedResource = parseAndNormalizeResource(resource);
    if (!normalizedResource) {
      return {
        error: "invalid_target",
        errorDescription:
          "resource must be a valid absolute URI without fragment",
      } as const;
    }

    if (!resourcesEqual(normalizedResource, mcpServerResource.toString())) {
      return {
        error: "invalid_target",
        errorDescription:
          "This authorization server only issues resource-bound tokens for its MCP endpoint",
      } as const;
    }

    return { resource: normalizedResource } as const;
  } catch {
    return {
      error: "invalid_target",
      errorDescription:
        "resource must be a valid absolute URI without fragment",
    } as const;
  }
}

function buildForwardHeaders(request: Request, trustedOrigin: string) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }
  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers.set("user-agent", userAgent);
  }
  headers.set("origin", trustedOrigin);
  headers.set("referer", `${trustedOrigin}/`);
  return headers;
}

async function resolveAuthorizeRedirect(
  response: Response,
): Promise<{ redirect: string | null; debugReason?: string }> {
  const location = response.headers.get("location");
  if (location) {
    return { redirect: location };
  }

  // In some runtimes, same-origin internal fetch may follow redirects even when
  // redirect mode is "manual". Preserve the final URL when it carries OAuth
  // redirect parameters.
  const responseUrl = response.url;
  if (responseUrl) {
    try {
      const parsed = new URL(responseUrl);
      if (
        parsed.searchParams.has("consent_code") ||
        parsed.searchParams.has("code") ||
        parsed.searchParams.has("error")
      ) {
        return { redirect: parsed.toString() };
      }
    } catch {
      // Ignore invalid response URL and continue parsing response body.
    }
  }

  const contentType = response.headers.get("content-type") ?? "(none)";
  const rawBody = await response.text().catch(() => "");
  const trimmedBody = rawBody.trim();

  if (trimmedBody) {
    try {
      const payload = JSON.parse(trimmedBody) as {
        url?: unknown;
        redirectURI?: unknown;
      };
      const jsonUrl =
        typeof payload.url === "string"
          ? payload.url
          : typeof payload.redirectURI === "string"
            ? payload.redirectURI
            : null;
      if (jsonUrl) {
        return { redirect: jsonUrl };
      }
    } catch {
      // Non-JSON response body.
    }

    if (/^https?:\/\//i.test(trimmedBody)) {
      return { redirect: trimmedBody };
    }
  }

  return {
    redirect: null,
    debugReason: [
      `upstream status=${response.status}`,
      `content-type=${contentType}`,
      `response-url=${response.url || "(none)"}`,
      `body-preview=${trimmedBody.slice(0, 240) || "(empty)"}`,
    ].join("; "),
  };
}

function parseRedirectError(redirectURL: string) {
  try {
    const parsed = new URL(redirectURL);
    const error = parsed.searchParams.get("error");
    if (!error) {
      return null;
    }
    return {
      error,
      error_description:
        parsed.searchParams.get("error_description") ?? undefined,
    };
  } catch {
    return null;
  }
}

function parseRedirectCode(redirectURL: string) {
  try {
    const parsed = new URL(redirectURL);
    return parsed.searchParams.get("code");
  } catch {
    return null;
  }
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
      prompt,
      code_challenge,
      code_challenge_method,
      resource,
    } = body;
    const normalizedChallengeMethod = code_challenge_method?.toUpperCase();

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
      !code_challenge ||
      normalizedChallengeMethod !== OAUTH_CODE_CHALLENGE_METHOD_S256
    ) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: "invalid_request",
        status: 400,
        reason: "client did not provide valid PKCE challenge",
        clientId: client_id,
        redirectUri: redirect_uri,
        userId: session.user.id,
      });
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description:
            "Clients must provide code_challenge with code_challenge_method=S256",
        },
        { status: 400 },
      );
    }

    if (
      code_challenge_method &&
      normalizedChallengeMethod !== OAUTH_CODE_CHALLENGE_METHOD_S256
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

    const trustedOrigin = getTrustedAuthOrigin(request);
    const authorizeUrl = buildTrustedAuthUrl(
      "/api/auth/oauth2/authorize",
      request,
    );
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", client_id);
    authorizeUrl.searchParams.set("redirect_uri", redirect_uri);
    authorizeUrl.searchParams.set("scope", scopes.join(" "));
    if (state) {
      authorizeUrl.searchParams.set("state", state);
    }
    authorizeUrl.searchParams.set("prompt", prompt ?? "consent");
    if (code_challenge) {
      authorizeUrl.searchParams.set("code_challenge", code_challenge);
    }
    if (code_challenge_method) {
      authorizeUrl.searchParams.set(
        "code_challenge_method",
        code_challenge_method.toLowerCase(),
      );
    }
    const authorizeResponse = await fetch(authorizeUrl, {
      method: "GET",
      headers: buildForwardHeaders(request, trustedOrigin),
      redirect: "manual",
      cache: "no-store",
    });
    const authorizeRedirectResult =
      await resolveAuthorizeRedirect(authorizeResponse);
    if (!authorizeRedirectResult.redirect) {
      logOAuthEvent("error", {
        route: "/api/oauth/authorize",
        event: "authorize_upstream_invalid_response",
        status: 500,
        reason: `${authorizeRedirectResult.debugReason ?? "authorize endpoint did not return redirect location"}; registered-redirect-uris=${client.redirectUris.join("|")}`,
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scopes,
        resource: resourceResult.resource ?? null,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const authorizeRedirect = authorizeRedirectResult.redirect;

    let finalRedirect = authorizeRedirect;
    const consentURL = new URL(authorizeRedirect, request.url);
    if (consentURL.pathname === "/oauth/authorize") {
      if (request.headers.get("x-oauth-interactive") === "1") {
        return NextResponse.json({ redirect: authorizeRedirect });
      }

      const consentCode = consentURL.searchParams.get("consent_code");
      if (!consentCode) {
        logOAuthEvent("error", {
          route: "/api/oauth/authorize",
          event: "missing_consent_code",
          status: 500,
          reason: "consent redirect missing consent_code",
          clientId: client_id,
          redirectUri: redirect_uri,
          scope: scopes,
          resource: resourceResult.resource ?? null,
          userId: session.user.id,
        });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      const consentResponse = await fetch(
        buildTrustedAuthUrl("/api/auth/oauth2/consent", request),
        {
          method: "POST",
          headers: {
            ...Object.fromEntries(
              buildForwardHeaders(request, trustedOrigin).entries(),
            ),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            accept: true,
            consent_code: consentCode,
          }),
          cache: "no-store",
        },
      );
      const consentBody = (await consentResponse.json().catch(() => null)) as {
        error?: string;
        error_description?: string;
        redirectURI?: string;
      } | null;
      if (!consentResponse.ok || !consentBody?.redirectURI) {
        logOAuthEvent("error", {
          route: "/api/oauth/authorize",
          event: "consent_upstream_invalid_response",
          status: 500,
          reason: consentResponse.ok
            ? "consent endpoint did not return redirectURI"
            : `consent endpoint rejected request (${consentResponse.status}): ${consentBody?.error_description ?? consentBody?.error ?? "unknown"}`,
          clientId: client_id,
          redirectUri: redirect_uri,
          scope: scopes,
          resource: resourceResult.resource ?? null,
          userId: session.user.id,
        });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
      finalRedirect = consentBody.redirectURI;
    }

    const redirectError = parseRedirectError(finalRedirect);
    if (redirectError) {
      logOAuthEvent("warn", {
        route: "/api/oauth/authorize",
        event: String(redirectError.error),
        status: 400,
        reason:
          redirectError.error_description ?? "upstream authorization error",
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scopes,
        resource: resourceResult.resource ?? null,
        userId: session.user.id,
      });
      return NextResponse.json(redirectError, { status: 400 });
    }

    const issuedCode = parseRedirectCode(finalRedirect);
    if (!issuedCode) {
      logOAuthEvent("error", {
        route: "/api/oauth/authorize",
        event: "authorization_code_missing",
        status: 500,
        reason: "final redirect did not contain authorization code",
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scopes,
        resource: resourceResult.resource ?? null,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (resourceResult.resource) {
      await setResourceBinding({
        identifier: getCodeResourceBindingIdentifier(issuedCode),
        resource: resourceResult.resource,
        expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
      });
    }

    return NextResponse.json({ redirect: finalRedirect });
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

export async function GET(request: Request) {
  const body = parseAuthorizeQuery(request);
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("content-type", "application/json");
  forwardedHeaders.set("x-oauth-interactive", "1");

  const postRequest = new Request(request.url, {
    method: "POST",
    headers: forwardedHeaders,
    body: JSON.stringify(body),
  });

  const postResponse = await POST(postRequest);
  if (!postResponse.ok) {
    return postResponse;
  }

  const payload = (await postResponse.json().catch(() => null)) as {
    redirect?: string;
  } | null;
  if (!payload?.redirect) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(payload.redirect, request.url), {
    status: 302,
  });
}
