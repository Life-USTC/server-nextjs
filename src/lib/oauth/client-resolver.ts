import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
  resolveOAuthClientScopes,
  validateOAuthRedirectUris,
} from "@/lib/oauth/client-registration";
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
type OAuthClientRecord = {
  id: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  name: string;
  redirectUris: string[];
  grantTypes: string[];
  scopes: string[];
};

function isClientMetadataDocumentClientId(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.pathname !== "/";
  } catch {
    return false;
  }
}

function normalizeGrantTypes(grantTypes?: string[]) {
  return [...new Set(grantTypes?.filter(Boolean) ?? ["authorization_code"])];
}

function toResolvedOAuthClient(client: OAuthClientRecord): ResolvedOAuthClient {
  if (
    client.tokenEndpointAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    client.tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD &&
    client.tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_POST_AUTH_METHOD
  ) {
    throw new Error(
      "Unsupported token_endpoint_auth_method in persisted client",
    );
  }

  return {
    ...client,
    tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
  };
}

async function resolveClientFromMetadataDocument(
  clientId: string,
): Promise<ClientResolutionResult> {
  let response: Response;

  try {
    response = await fetch(clientId, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return {
      error: "invalid_client",
      errorDescription: "Failed to fetch client metadata document",
    };
  }

  if (!response.ok) {
    return {
      error: "invalid_client",
      errorDescription: "Client metadata document did not return HTTP 200",
    };
  }

  let rawMetadata: unknown;
  try {
    rawMetadata = await response.json();
  } catch {
    return {
      error: "invalid_client",
      errorDescription: "Client metadata document did not return valid JSON",
    };
  }

  const parsedMetadata = OAuthClientMetadataSchema.safeParse(rawMetadata);
  if (!parsedMetadata.success) {
    return {
      error: "invalid_client",
      errorDescription: "Client metadata document is not valid OAuth metadata",
    };
  }

  const metadata = parsedMetadata.data;
  const documentClientId =
    rawMetadata &&
    typeof rawMetadata === "object" &&
    "client_id" in rawMetadata &&
    typeof rawMetadata.client_id === "string"
      ? rawMetadata.client_id
      : undefined;
  if (documentClientId !== clientId) {
    return {
      error: "invalid_client",
      errorDescription:
        "Client metadata document client_id does not match the document URL",
    };
  }

  const clientName = metadata.client_name?.trim();
  if (!clientName) {
    return {
      error: "invalid_client",
      errorDescription:
        "Client metadata document must include a non-empty client_name",
    };
  }

  const redirectUrisResult = validateOAuthRedirectUris(metadata.redirect_uris);
  if ("error" in redirectUrisResult) {
    return {
      error: "invalid_client",
      errorDescription: redirectUrisResult.error,
    };
  }

  const tokenEndpointAuthMethod =
    metadata.token_endpoint_auth_method ?? OAUTH_PUBLIC_CLIENT_AUTH_METHOD;
  if (tokenEndpointAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD) {
    return {
      error: "invalid_client",
      errorDescription:
        "Client metadata document clients currently support token_endpoint_auth_method=none only",
    };
  }

  const grantTypes = normalizeGrantTypes(metadata.grant_types);
  if (!grantTypes.includes("authorization_code")) {
    return {
      error: "invalid_client",
      errorDescription:
        'Client metadata document grant_types must include "authorization_code"',
    };
  }

  const responseTypes = metadata.response_types?.filter(Boolean) ?? ["code"];
  if (!responseTypes.includes("code")) {
    return {
      error: "invalid_client",
      errorDescription:
        'Client metadata document response_types must include "code"',
    };
  }

  const scopesResult = resolveOAuthClientScopes({
    defaultScopes: DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
    requestedScopes: metadata.scope,
  });
  if ("error" in scopesResult) {
    return {
      error: "invalid_client",
      errorDescription: scopesResult.error,
    };
  }

  try {
    const client = await prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret: null,
        tokenEndpointAuthMethod: OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
        name: clientName,
        redirectUris: redirectUrisResult.redirectUris,
        grantTypes,
        scopes: scopesResult.scopes,
      },
      select: {
        id: true,
        clientId: true,
        clientSecret: true,
        tokenEndpointAuthMethod: true,
        name: true,
        redirectUris: true,
        grantTypes: true,
        scopes: true,
      },
    });

    return { client: toResolvedOAuthClient(client) };
  } catch {
    const existingClient = await prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        id: true,
        clientId: true,
        clientSecret: true,
        tokenEndpointAuthMethod: true,
        name: true,
        redirectUris: true,
        grantTypes: true,
        scopes: true,
      },
    });

    if (!existingClient) {
      return {
        error: "invalid_client",
        errorDescription: "Failed to persist client metadata document client",
      };
    }

    return { client: toResolvedOAuthClient(existingClient) };
  }
}

export async function resolveOAuthClient(
  clientId: string,
): Promise<ClientResolutionResult> {
  const existingClient = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: {
      id: true,
      clientId: true,
      clientSecret: true,
      tokenEndpointAuthMethod: true,
      name: true,
      redirectUris: true,
      grantTypes: true,
      scopes: true,
    },
  });

  if (existingClient) {
    return { client: toResolvedOAuthClient(existingClient) };
  }

  if (!isClientMetadataDocumentClientId(clientId)) {
    return {
      error: "invalid_client",
      errorDescription: "OAuth client was not found",
    };
  }

  return resolveClientFromMetadataDocument(clientId);
}
