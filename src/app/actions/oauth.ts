"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth, authApi } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  resolveOAuthClientScopes,
  validateOAuthRedirectUris,
} from "@/lib/oauth/client-registration";
import {
  DEFAULT_OAUTH_CLIENT_SCOPES,
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

  try {
    const result = await authApi.adminCreateOAuthClient({
      headers: await headers(),
      body: {
        client_name: name,
        redirect_uris: redirectUrisResult.redirectUris,
        token_endpoint_auth_method: tokenEndpointAuthMethod,
        grant_types: scopes.includes("offline_access")
          ? ["authorization_code", "refresh_token"]
          : ["authorization_code"],
        response_types: ["code"],
        scope: scopes.join(" "),
        require_pkce: true,
        metadata: {
          source: "admin_panel",
        },
      },
    });

    revalidatePath("/admin/oauth");
    return {
      success: true,
      clientId: result.client_id,
      clientSecret: result.client_secret ?? null,
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to create OAuth client" };
  }
}

export async function deleteOAuthClient(clientId: string) {
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
    await authApi.deleteOAuthClient({
      headers: await headers(),
      body: {
        client_id: clientId,
      },
    });
  } catch (error) {
    console.error(error);
    return { error: "Failed to delete OAuth client" };
  }

  revalidatePath("/admin/oauth");
  return { success: true };
}
