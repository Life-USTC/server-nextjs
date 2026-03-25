import { prisma } from "@/lib/db/prisma";
import { DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES } from "@/lib/oauth/client-registration";
import {
  OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
  OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
  type SupportedOAuthClientAuthMethod,
} from "@/lib/oauth/utils";

export type ResolvedOAuthClient = {
  id: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: SupportedOAuthClientAuthMethod;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  scopes: string[];
};

type ClientResolutionResult =
  | { client: ResolvedOAuthClient }
  | { error: "invalid_client"; errorDescription: string };
type OAuthApplicationRecord = {
  id: string;
  name: string;
  metadata: string | null;
  clientId: string;
  clientSecret: string | null;
  redirectUrls: string;
  type: string;
  authenticationScheme: string;
  disabled: boolean;
};

type PersistedOAuthClientMetadata = {
  scopes?: unknown;
  grantTypes?: unknown;
  tokenEndpointAuthMethod?: unknown;
};

// Disabled: URL-shaped `client_id` + metadata document fetch (SSRF surface).
// function isClientMetadataDocumentClientId(clientId: string): boolean {
//   try {
//     const url = new URL(clientId);
//     return url.protocol === "https:" && url.pathname !== "/";
//   } catch {
//     return false;
//   }
// }

// function normalizeGrantTypes(grantTypes?: string[]) {
//   return [...new Set(grantTypes?.filter(Boolean) ?? ["authorization_code"])];
// }

function parsePersistedMetadata(
  raw: string | null,
): PersistedOAuthClientMetadata | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as PersistedOAuthClientMetadata;
  } catch {
    return null;
  }
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const parsed = value.filter(
    (item): item is string => typeof item === "string",
  );
  if (parsed.length === 0) {
    return [...fallback];
  }
  return [...new Set(parsed)];
}

function resolveAuthMethod(
  client: OAuthApplicationRecord,
  metadata: PersistedOAuthClientMetadata | null,
): SupportedOAuthClientAuthMethod {
  const fromMetadata = metadata?.tokenEndpointAuthMethod;
  if (
    fromMetadata === OAUTH_PUBLIC_CLIENT_AUTH_METHOD ||
    fromMetadata === OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD ||
    fromMetadata === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD
  ) {
    return fromMetadata;
  }

  const fromSchema = client.authenticationScheme;
  if (
    fromSchema === OAUTH_PUBLIC_CLIENT_AUTH_METHOD ||
    fromSchema === OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD ||
    fromSchema === OAUTH_CLIENT_SECRET_POST_AUTH_METHOD
  ) {
    return fromSchema;
  }

  return client.type === "public"
    ? OAUTH_PUBLIC_CLIENT_AUTH_METHOD
    : OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD;
}

function toResolvedOAuthClient(
  client: OAuthApplicationRecord,
): ResolvedOAuthClient {
  const metadata = parsePersistedMetadata(client.metadata);
  const tokenEndpointAuthMethod = resolveAuthMethod(client, metadata);

  return {
    id: client.id,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    tokenEndpointAuthMethod,
    name: client.name,
    redirectUris: client.redirectUrls
      .split(",")
      .map((uri) => uri.trim())
      .filter(Boolean),
    grantTypes: readStringArray(metadata?.grantTypes, ["authorization_code"]),
    scopes: readStringArray(
      metadata?.scopes,
      DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
    ),
  };
}

// `resolveClientFromMetadataDocument` (fetch URL client_id JSON) was removed here to avoid SSRF;
// re-enable only with strict allowlists/timeouts. Previous implementation is in git history.

export async function resolveOAuthClient(
  clientId: string,
): Promise<ClientResolutionResult> {
  const existingClient = await prisma.oidcApplication.findUnique({
    where: { clientId },
    select: {
      id: true,
      name: true,
      metadata: true,
      clientId: true,
      clientSecret: true,
      redirectUrls: true,
      type: true,
      authenticationScheme: true,
      disabled: true,
    },
  });

  if (existingClient) {
    if (existingClient.disabled) {
      return {
        error: "invalid_client",
        errorDescription: "OAuth client is disabled",
      };
    }
    return { client: toResolvedOAuthClient(existingClient) };
  }

  return {
    error: "invalid_client",
    errorDescription: "OAuth client was not found",
  };
}
