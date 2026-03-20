"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_OAUTH_CLIENT_SCOPES,
  generateToken,
  hashOAuthClientSecret,
  MCP_TOOLS_SCOPE,
  OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

export async function createOAuthClient(formData: FormData) {
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

  for (const uri of redirectUris) {
    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      return { error: `Invalid redirect URI: ${uri}` };
    }

    const isLocalhost =
      parsedUri.hostname === "localhost" || parsedUri.hostname === "127.0.0.1";
    const isAllowedScheme =
      parsedUri.protocol === "https:" ||
      (parsedUri.protocol === "http:" && isLocalhost);

    if (!isAllowedScheme) {
      return {
        error:
          "Redirect URIs must use https, or http only for localhost/127.0.0.1",
      };
    }
  }

  const clientId = generateToken(16);
  const scopes = enableMcp
    ? [...DEFAULT_OAUTH_CLIENT_SCOPES, MCP_TOOLS_SCOPE]
    : [...DEFAULT_OAUTH_CLIENT_SCOPES];

  if (
    tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD &&
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

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecret: hashedClientSecret,
      tokenEndpointAuthMethod,
      name,
      redirectUris,
      scopes,
    },
  });

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

  await prisma.oAuthClient.delete({ where: { id: clientDbId } });

  revalidatePath("/admin/oauth");
  return { success: true };
}
