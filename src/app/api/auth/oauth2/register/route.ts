import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logOAuthDebug } from "@/lib/log/oauth-debug";

export const dynamic = "force-dynamic";

function generateClientId(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

function generateClientSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function jsonError(status: number, error: string, error_description: string) {
  return NextResponse.json({ error, error_description }, { status });
}

export async function POST(request: Request) {
  logOAuthDebug("dcr.register.request", request, {
    path: new URL(request.url).pathname,
  });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logOAuthDebug("dcr.register.reject", request, {
      reason: "invalid_json",
    });
    return jsonError(400, "invalid_request", "Request body must be JSON");
  }

  if (!body || typeof body !== "object") {
    logOAuthDebug("dcr.register.reject", request, {
      reason: "invalid_body_shape",
    });
    return jsonError(400, "invalid_request", "Invalid JSON body");
  }

  const record = body as Record<string, unknown>;
  const redirectUris = record.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every((v) => typeof v === "string" && v.length > 0)
  ) {
    logOAuthDebug("dcr.register.reject", request, {
      reason: "invalid_redirect_uris",
    });
    return jsonError(
      400,
      "invalid_client_metadata",
      "redirect_uris must be a non-empty array of strings",
    );
  }

  const requestedAuthMethod =
    typeof record.token_endpoint_auth_method === "string"
      ? record.token_endpoint_auth_method
      : "none";

  // Workaround: some ChatGPT clients appear to expect `client_secret` to be present.
  // Register a confidential client by default, so a secret is always returned.
  const tokenEndpointAuthMethod =
    requestedAuthMethod === "client_secret_post" ||
    requestedAuthMethod === "client_secret_basic"
      ? requestedAuthMethod
      : "client_secret_post";

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  const scope =
    typeof record.scope === "string" && record.scope.trim().length > 0
      ? record.scope.trim()
      : "openid profile email offline_access mcp:tools";

  const now = Math.floor(Date.now() / 1000);

  try {
    await prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret,
        redirectUris: redirectUris as string[],
        tokenEndpointAuthMethod,
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        requirePKCE: true,
        scopes: scope.split(" ").filter(Boolean),
        public: false,
        disabled: false,
        metadata: {
          source: "dcr",
          requested_token_endpoint_auth_method: requestedAuthMethod,
        },
      },
      select: { id: true },
    });
  } catch (err) {
    logOAuthDebug("dcr.register.error", request, {
      reason: "prisma_create_failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "server_error", "Failed to persist OAuth client");
  }

  logOAuthDebug("dcr.register.success", request, {
    clientIdPrefix: clientId.slice(0, 8),
    redirectUriCount: redirectUris.length,
    tokenEndpointAuthMethod,
    scopeTokenCount: scope.split(" ").filter(Boolean).length,
  });

  return NextResponse.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: now,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope,
  });
}
