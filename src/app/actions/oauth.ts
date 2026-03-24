"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  resolveOAuthClientScopes,
  validateOAuthRedirectUris,
} from "@/lib/oauth/client-registration";
import { logOAuthEvent } from "@/lib/oauth/logging";
import {
  DEFAULT_OAUTH_CLIENT_SCOPES,
  generateToken,
  hashOAuthClientSecret,
  MCP_TOOLS_SCOPE,
  OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
  OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

type CreateOAuthClientResult =
  | { error: string }
  | { success: true; clientId: string; clientSecret: string | null };

export async function createOAuthClient(
  formData: FormData,
): Promise<CreateOAuthClientResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: "Not authorized" };
  }

  const name = (formData.get("name") as string)?.trim();
  const redirectUrisRaw = (formData.get("redirectUris") as string)?.trim();
  const tokenEndpointAuthMethod =
    (formData.get("tokenEndpointAuthMethod") as string)?.trim() ||
    OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;
  const requestedScopes = formData
    .getAll("scopes")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const enableMcp =
    formData.get("enableMcp") === "on" || formData.get("enableMcp") === "true";

  if (!name) {
    return { error: "Name is required" };
  }
  if (!redirectUrisRaw) {
    return { error: "At least one redirect URI is required" };
  }

  const redirectUris = redirectUrisRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const redirectUrisResult = validateOAuthRedirectUris(redirectUris);
  if ("error" in redirectUrisResult) {
    return { error: redirectUrisResult.error };
  }

  const clientId = generateToken(16);
  const scopesResult = resolveOAuthClientScopes({
    defaultScopes: enableMcp
      ? [...DEFAULT_OAUTH_CLIENT_SCOPES, MCP_TOOLS_SCOPE]
      : [...DEFAULT_OAUTH_CLIENT_SCOPES],
    requestedScopes: requestedScopes.length > 0 ? requestedScopes : undefined,
  });
  if ("error" in scopesResult) {
    return { error: scopesResult.error };
  }
  const scopes = scopesResult.scopes;

  if (
    tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD &&
    tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_POST_AUTH_METHOD &&
    tokenEndpointAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD
  ) {
    return { error: "Unsupported token endpoint auth method" };
  }

  const clientSecret =
    tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD
      ? null
      : generateToken(32);
  const hashedClientSecret = clientSecret
    ? await hashOAuthClientSecret(clientSecret)
    : null;
  const grantTypes =
    tokenEndpointAuthMethod === OAUTH_PUBLIC_CLIENT_AUTH_METHOD
      ? ["authorization_code"]
      : ["authorization_code", "refresh_token"];

  try {
    await prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret: hashedClientSecret,
        tokenEndpointAuthMethod,
        name,
        redirectUris: [...redirectUrisResult.redirectUris],
        grantTypes,
        scopes: [...scopes],
      },
    });
  } catch (error) {
    logOAuthEvent(
      "error",
      {
        route: "/admin/oauth",
        event: "admin_client_create_failed",
        status: 500,
        reason: "failed to persist oauth client from admin panel",
        clientId,
        registeredAuthMethod: tokenEndpointAuthMethod,
        redirectUri: redirectUrisResult.redirectUris[0] ?? null,
        scope: scopes,
        userId: session.user.id,
      },
      error,
    );
    return { error: "Failed to create OAuth client" };
  }

  revalidatePath("/admin/oauth");

  return { success: true, clientId, clientSecret };
}

export async function deleteOAuthClient(clientDbId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: "Not authorized" };
  }

  try {
    await prisma.oAuthClient.delete({ where: { id: clientDbId } });
  } catch (error) {
    logOAuthEvent(
      "error",
      {
        route: "/admin/oauth",
        event: "admin_client_delete_failed",
        status: 500,
        reason: "failed to delete oauth client from admin panel",
        userId: session.user.id,
      },
      error,
    );
    return { error: "Failed to delete OAuth client" };
  }

  revalidatePath("/admin/oauth");
  return { success: true };
}
