import { prisma } from "@/lib/db/prisma";
import { generateToken, PLAYWRIGHT_BASE_URL } from "./core";

export async function createOAuthClientFixture(
  options: {
    name?: string;
    redirectUris?: string[];
    scopes?: string[];
    grantTypes?: string[];
    clientId?: string;
    clientSecret?: string;
    tokenEndpointAuthMethod?:
      | "client_secret_basic"
      | "client_secret_post"
      | "none";
  } = {},
) {
  const clientId = options.clientId ?? generateToken(16);
  const tokenEndpointAuthMethod =
    options.tokenEndpointAuthMethod ?? "client_secret_basic";
  const clientSecret =
    tokenEndpointAuthMethod === "none"
      ? null
      : (options.clientSecret ?? generateToken(24));
  const publicClientStoredSecret = generateToken(24);
  const redirectUris = options.redirectUris ?? [
    `${PLAYWRIGHT_BASE_URL}/oauth-e2e/callback`,
  ];
  const grantTypes =
    options.grantTypes ??
    (tokenEndpointAuthMethod === "none"
      ? ["authorization_code"]
      : ["authorization_code", "refresh_token"]);
  const scopes = options.scopes ?? ["openid", "profile"];
  const name = options.name ?? `e2e-oauth-${Date.now()}`;

  const client = await prisma.oAuthClient.create({
    data: {
      name,
      clientId,
      clientSecret:
        tokenEndpointAuthMethod === "none"
          ? publicClientStoredSecret
          : clientSecret,
      redirectUris,
      type: tokenEndpointAuthMethod === "none" ? "public" : "web",
      tokenEndpointAuthMethod,
      disabled: false,
      scopes,
      grantTypes,
      responseTypes: ["code"],
      requirePKCE: true,
      metadata: { source: "e2e_fixture" },
    },
    select: {
      id: true,
      clientId: true,
      name: true,
      tokenEndpointAuthMethod: true,
      redirectUris: true,
      scopes: true,
    },
  });

  return {
    ...client,
    tokenEndpointAuthMethod:
      client.tokenEndpointAuthMethod ?? "client_secret_basic",
    clientSecret,
  };
}

export async function deleteOAuthClientsByName(name: string) {
  await prisma.oAuthClient.deleteMany({
    where: { name },
  });
}

export async function ensureLinkedAccountFixture(options: {
  userId: string;
  provider: "github" | "google" | "oidc";
  providerAccountId?: string;
  email?: string;
}) {
  const providerAccountId =
    options.providerAccountId ??
    `${options.provider}-e2e-${Date.now()}-${generateToken(6)}`;
  const email =
    options.email ??
    `${options.provider}-${Date.now()}-${generateToken(6)}@example.test`;

  await prisma.account.create({
    data: {
      userId: options.userId,
      type: "oauth",
      provider: options.provider,
      providerAccountId,
    },
  });

  await prisma.verifiedEmail.create({
    data: {
      userId: options.userId,
      provider: options.provider,
      email,
    },
  });

  return {
    provider: options.provider,
    providerAccountId,
    email,
  };
}

export async function deleteLinkedAccountFixture(options: {
  userId: string;
  provider: string;
}) {
  await prisma.account.deleteMany({
    where: {
      userId: options.userId,
      provider: options.provider,
    },
  });

  await prisma.verifiedEmail.deleteMany({
    where: {
      userId: options.userId,
      provider: options.provider,
    },
  });
}
