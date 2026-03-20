import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  CODE_LIFETIME_MS,
  generateToken,
  OAUTH_CODE_CHALLENGE_METHOD_S256,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

/**
 * POST /api/oauth/authorize
 *
 * Issues an authorization code after the user consents.
 * Expects a JSON body with: client_id, redirect_uri, scope, state.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    resource?: string;
  };

  try {
    body = await request.json();
  } catch {
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
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: client_id },
    select: {
      id: true,
      redirectUris: true,
      scopes: true,
      tokenEndpointAuthMethod: true,
    },
  });

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri" },
      { status: 400 },
    );
  }

  const requested = scope?.split(" ").filter(Boolean) ?? client.scopes;
  // Only grant scopes that the client is registered for
  const scopes = requested.filter((s) => client.scopes.includes(s));

  if (scopes.length === 0) {
    return NextResponse.json(
      {
        error: "invalid_scope",
        error_description:
          "None of the requested scopes are allowed for this client",
      },
      { status: 400 },
    );
  }

  if (
    client.tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    (!code_challenge ||
      code_challenge_method !== OAUTH_CODE_CHALLENGE_METHOD_S256)
  ) {
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
      resource: resource ?? null,
      expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
      clientId: client.id,
      userId: session.user.id,
    },
  });

  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return NextResponse.json({ redirect: url.toString() });
}
