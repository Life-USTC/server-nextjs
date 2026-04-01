import { randomBytes } from "node:crypto";
import { jsonResponse } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { logOAuthDebug } from "@/lib/log/oauth-debug";
import {
  parseOAuthDcrClientName,
  resolveDcrStoredClientName,
} from "@/lib/oauth/client-registration";
import { hashOAuthClientSecretForDbStorage } from "@/lib/oauth/utils";

export const dynamic = "force-dynamic";

function generateClientId(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

function generateClientSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function jsonError(status: number, error: string, error_description: string) {
  return jsonResponse({ error, error_description }, { status });
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

  let tokenEndpointAuthMethod: string;
  let publicClient: boolean;
  let clientSecretPlain: string | null = null;
  let storedClientSecret: string | null = null;

  if (requestedAuthMethod === "none") {
    tokenEndpointAuthMethod = "none";
    publicClient = true;
  } else if (
    requestedAuthMethod === "client_secret_post" ||
    requestedAuthMethod === "client_secret_basic"
  ) {
    tokenEndpointAuthMethod = requestedAuthMethod;
    publicClient = false;
    clientSecretPlain = generateClientSecret();
    storedClientSecret = hashOAuthClientSecretForDbStorage(clientSecretPlain);
  } else {
    logOAuthDebug("dcr.register.reject", request, {
      reason: "unsupported_token_endpoint_auth_method",
      token_endpoint_auth_method: requestedAuthMethod,
    });
    return jsonError(
      400,
      "invalid_client_metadata",
      "token_endpoint_auth_method must be none, client_secret_post, or client_secret_basic",
    );
  }

  const clientId = generateClientId();

  const clientNameResult = parseOAuthDcrClientName(record);
  if (!clientNameResult.ok) {
    logOAuthDebug("dcr.register.reject", request, {
      reason: "invalid_client_name",
      detail: clientNameResult.error,
    });
    return jsonError(400, "invalid_client_metadata", clientNameResult.error);
  }
  const storedClientName = resolveDcrStoredClientName(
    clientId,
    clientNameResult.name,
  );

  const scope =
    typeof record.scope === "string" && record.scope.trim().length > 0
      ? record.scope.trim()
      : "openid profile email offline_access mcp:tools";

  const now = Math.floor(Date.now() / 1000);

  try {
    await prisma.oAuthClient.create({
      data: {
        clientId,
        name: storedClientName,
        clientSecret: storedClientSecret,
        redirectUris: redirectUris as string[],
        tokenEndpointAuthMethod,
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        requirePKCE: true,
        scopes: scope.split(" ").filter(Boolean),
        public: publicClient,
        disabled: false,
        metadata: {
          source: "dcr",
          requested_token_endpoint_auth_method: requestedAuthMethod,
          ...(clientNameResult.name ? {} : { client_name_inferred: true }),
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
    publicClient,
    scopeTokenCount: scope.split(" ").filter(Boolean).length,
    hasExplicitClientName: Boolean(clientNameResult.name),
  });

  const registrationBody: Record<string, unknown> = {
    client_id: clientId,
    client_id_issued_at: now,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope,
  };
  if (clientSecretPlain) {
    registrationBody.client_secret = clientSecretPlain;
  }
  registrationBody.client_name = storedClientName;

  return jsonResponse(registrationBody);
}
