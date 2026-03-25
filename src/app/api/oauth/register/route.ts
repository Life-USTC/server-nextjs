import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { validateDynamicClientRegistration } from "@/lib/oauth/client-registration";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  generateToken,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

/**
 * POST /api/oauth/register
 *
 * OAuth 2.0 Dynamic Client Registration.
 * Supports public PKCE clients and confidential clients authenticated with
 * client_secret_basic or client_secret_post.
 */
export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    logOAuthEvent("warn", {
      route: "/api/oauth/register",
      event: "invalid_client_metadata",
      status: 400,
      reason: "dynamic registration body could not be parsed",
    });
    return NextResponse.json(
      { error: "invalid_client_metadata" },
      { status: 400 },
    );
  }

  const parsedBody = OAuthClientMetadataSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    logOAuthEvent("warn", {
      route: "/api/oauth/register",
      event: "invalid_client_metadata",
      status: 400,
      reason: "dynamic registration body did not match OAuth client metadata",
    });
    return NextResponse.json(
      { error: "invalid_client_metadata" },
      { status: 400 },
    );
  }

  const body = parsedBody.data;
  const validated = validateDynamicClientRegistration({
    clientName: body.client_name,
    redirectUris: body.redirect_uris,
    grantTypes: body.grant_types,
    responseTypes: body.response_types,
    tokenEndpointAuthMethod: body.token_endpoint_auth_method,
    scope: body.scope,
  });
  if ("error" in validated) {
    logOAuthEvent("warn", {
      route: "/api/oauth/register",
      event: "invalid_client_metadata",
      status: 400,
      reason: validated.error,
      registeredAuthMethod: body.token_endpoint_auth_method ?? null,
      redirectUri: body.redirect_uris?.[0] ?? null,
      scope: body.scope ?? null,
    });
    return NextResponse.json(
      {
        error: "invalid_client_metadata",
        error_description: validated.error,
      },
      { status: 400 },
    );
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const clientId = generateToken(16);
  const clientSecret =
    validated.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD
      ? null
      : generateToken(32);
  const clientType =
    validated.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD
      ? "public"
      : "web";

  try {
    await prisma.oidcApplication.create({
      data: {
        name: validated.clientName,
        clientId,
        clientSecret:
          clientType === "public" ? generateToken(24) : (clientSecret ?? null),
        redirectUrls: validated.redirectUris.join(","),
        type: clientType,
        authenticationScheme: validated.tokenEndpointAuthMethod,
        disabled: false,
        metadata: JSON.stringify({
          source: "dynamic_registration",
          scopes: validated.scopes,
          grantTypes: validated.grantTypes,
          tokenEndpointAuthMethod: validated.tokenEndpointAuthMethod,
        }),
      },
    });
  } catch (error) {
    logOAuthEvent(
      "error",
      {
        route: "/api/oauth/register",
        event: "registration_failed",
        status: 500,
        reason: "failed to persist dynamic client registration",
        clientId,
        registeredAuthMethod: validated.tokenEndpointAuthMethod,
        redirectUri: validated.redirectUris[0] ?? null,
        scope: validated.scopes,
      },
      error,
    );
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: createdAt,
      client_name: validated.clientName,
      redirect_uris: validated.redirectUris,
      grant_types: validated.grantTypes,
      response_types: validated.responseTypes,
      token_endpoint_auth_method: validated.tokenEndpointAuthMethod,
      scope: validated.scopes.join(" "),
      ...(clientSecret
        ? {
            client_secret: clientSecret,
            client_secret_expires_at: 0,
          }
        : {}),
    },
    { status: 201 },
  );
}
