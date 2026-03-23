import {
  DEFAULT_OAUTH_CLIENT_SCOPES,
  MCP_TOOLS_SCOPE,
  OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD,
  OAUTH_CLIENT_SECRET_POST_AUTH_METHOD,
  OAUTH_PUBLIC_CLIENT_AUTH_METHOD,
} from "@/lib/oauth/utils";

export const DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES = [
  ...DEFAULT_OAUTH_CLIENT_SCOPES,
  MCP_TOOLS_SCOPE,
];

type ValidationErrorResult = { error: string };
type RedirectUrisResult = ValidationErrorResult | { redirectUris: string[] };
type ScopesResult = ValidationErrorResult | { scopes: string[] };
type DynamicClientRegistrationResult =
  | ValidationErrorResult
  | {
      clientName: string;
      redirectUris: string[];
      tokenEndpointAuthMethod:
        | typeof OAUTH_PUBLIC_CLIENT_AUTH_METHOD
        | typeof OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD
        | typeof OAUTH_CLIENT_SECRET_POST_AUTH_METHOD;
      grantTypes: string[];
      responseTypes: string[];
      scopes: string[];
    };

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const SUPPORTED_DYNAMIC_CLIENT_SCOPES = new Set(
  DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
);
const SUPPORTED_DYNAMIC_GRANT_TYPES = new Set([
  "authorization_code",
  "refresh_token",
]);

export function validateOAuthRedirectUris(
  redirectUris: string[],
): RedirectUrisResult {
  if (redirectUris.length === 0) {
    return { error: "At least one redirect URI is required" } as const;
  }

  for (const uri of redirectUris) {
    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      return { error: `Invalid redirect URI: ${uri}` };
    }

    const isLoopbackRedirect = LOOPBACK_HOSTNAMES.has(parsedUri.hostname);
    const isAllowedScheme =
      parsedUri.protocol === "https:" ||
      (parsedUri.protocol === "http:" && isLoopbackRedirect);

    if (!isAllowedScheme) {
      return {
        error:
          "Redirect URIs must use https, or http only for localhost/127.0.0.1",
      };
    }
  }

  return { redirectUris };
}

export function resolveOAuthClientScopes(options: {
  defaultScopes: string[];
  requestedScopes?: string[] | string | null;
}): ScopesResult {
  const requestedScopes =
    typeof options.requestedScopes === "string"
      ? options.requestedScopes.split(" ").filter(Boolean)
      : (options.requestedScopes ?? []);

  if (requestedScopes.length === 0) {
    return { scopes: [...options.defaultScopes] };
  }

  const invalidScopes = requestedScopes.filter(
    (scope) => !SUPPORTED_DYNAMIC_CLIENT_SCOPES.has(scope),
  );

  if (invalidScopes.length > 0) {
    return {
      error: `Unsupported scopes requested: ${invalidScopes.join(", ")}`,
    };
  }

  return { scopes: [...new Set(requestedScopes)] };
}

export function validateDynamicClientRegistration(options: {
  clientName?: string | null;
  redirectUris?: string[] | null;
  grantTypes?: string[] | null;
  responseTypes?: string[] | null;
  tokenEndpointAuthMethod?: string | null;
  scope?: string | null;
}): DynamicClientRegistrationResult {
  const redirectUrisResult = validateOAuthRedirectUris(
    options.redirectUris?.filter(Boolean) ?? [],
  );
  if ("error" in redirectUrisResult) {
    return redirectUrisResult;
  }

  const tokenEndpointAuthMethod =
    options.tokenEndpointAuthMethod ?? OAUTH_PUBLIC_CLIENT_AUTH_METHOD;
  if (
    tokenEndpointAuthMethod !== OAUTH_PUBLIC_CLIENT_AUTH_METHOD &&
    tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD &&
    tokenEndpointAuthMethod !== OAUTH_CLIENT_SECRET_POST_AUTH_METHOD
  ) {
    return {
      error:
        "Dynamic client registration only supports token_endpoint_auth_method values none, client_secret_basic, and client_secret_post",
    };
  }

  const requestedGrantTypes = options.grantTypes?.filter(Boolean) ?? [
    "authorization_code",
  ];
  if (!requestedGrantTypes.includes("authorization_code")) {
    return {
      error:
        'Dynamic client registration requires grant_types to include "authorization_code"',
    };
  }
  const invalidGrantTypes = requestedGrantTypes.filter(
    (grantType) => !SUPPORTED_DYNAMIC_GRANT_TYPES.has(grantType),
  );
  if (invalidGrantTypes.length > 0) {
    return {
      error: `Unsupported grant_types requested: ${invalidGrantTypes.join(", ")}`,
    };
  }
  const grantTypes = [...new Set(requestedGrantTypes)];

  const requestedResponseTypes = options.responseTypes?.filter(Boolean) ?? [
    "code",
  ];
  if (!requestedResponseTypes.includes("code")) {
    return {
      error:
        'Dynamic client registration requires response_types to include "code"',
    };
  }
  const responseTypes = ["code"];

  const scopesResult = resolveOAuthClientScopes({
    defaultScopes: DEFAULT_DYNAMIC_OAUTH_CLIENT_SCOPES,
    requestedScopes: options.scope,
  });
  if ("error" in scopesResult) {
    return scopesResult;
  }

  return {
    clientName: options.clientName?.trim() || "Dynamic OAuth Client",
    redirectUris: redirectUrisResult.redirectUris,
    tokenEndpointAuthMethod,
    grantTypes,
    responseTypes,
    scopes: scopesResult.scopes,
  };
}
