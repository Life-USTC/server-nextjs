import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { validateDynamicClientRegistration } from "@/lib/oauth/client-registration";
import { generateToken } from "@/lib/oauth/utils";

/**
 * POST /api/oauth/register
 *
 * OAuth 2.0 Dynamic Client Registration for public PKCE clients.
 * Used by MCP clients such as Codex to self-register before starting OAuth.
 */
export async function POST(request: Request) {
  let body: {
    client_name?: string;
    redirect_uris?: string[];
    grant_types?: string[];
    response_types?: string[];
    token_endpoint_auth_method?: string;
    scope?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata" },
      { status: 400 },
    );
  }

  const validated = validateDynamicClientRegistration({
    clientName: body.client_name,
    redirectUris: body.redirect_uris,
    grantTypes: body.grant_types,
    responseTypes: body.response_types,
    tokenEndpointAuthMethod: body.token_endpoint_auth_method,
    scope: body.scope,
  });
  if ("error" in validated) {
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

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecret: null,
      tokenEndpointAuthMethod: validated.tokenEndpointAuthMethod,
      name: validated.clientName,
      redirectUris: [...validated.redirectUris],
      scopes: [...validated.scopes],
    },
  });

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
    },
    { status: 201 },
  );
}
