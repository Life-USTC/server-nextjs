export const MCP_ROUTE_PATH = "/api/mcp";
export const OAUTH_AUTHORIZATION_PATH = "/api/auth/oauth2/authorize";
export const OAUTH_REGISTRATION_PATH = "/api/auth/oauth2/register";
export const OAUTH_TOKEN_PATH = "/api/auth/oauth2/token";
export const OAUTH_AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";
export const OAUTH_PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource";
export const OAUTH_ISSUER_PATH = "/api/auth";

/**
 * Canonical Better Auth public base (no trailing slash). Must match `AUTH_BASE_URL` in `auth.ts`
 * so JWT `iss` / `aud` line up with MCP verification and metadata.
 */
export function getBetterAuthBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Site origin for root-level `.well-known` URLs (scheme + host + optional port). */
function getWellKnownSiteOrigin(): string {
  return new URL(`${getBetterAuthBaseUrl()}/`).origin;
}

/**
 * OAuth resource indicator / access-token audience for MCP. Matches `validAudiences` in `oauthProvider`.
 */
export function getOAuthMcpResourceUrl(): string {
  return `${getBetterAuthBaseUrl()}${MCP_ROUTE_PATH}`;
}

export function getJwksUrlForOAuthVerification(): string {
  return new URL("/api/auth/jwks", `${getBetterAuthBaseUrl()}/`).toString();
}

export function getMcpServerUrl(_request?: Request): URL {
  return new URL(getOAuthMcpResourceUrl());
}

export function getOAuthIssuerUrl(_request?: Request): URL {
  return new URL(OAUTH_ISSUER_PATH, `${getWellKnownSiteOrigin()}/`);
}

export function getOAuthAuthorizationServerMetadataUrl(
  _request?: Request,
): URL {
  return new URL(
    OAUTH_AUTHORIZATION_SERVER_METADATA_PATH,
    `${getWellKnownSiteOrigin()}/`,
  );
}

export function getOAuthProtectedResourceMetadataUrl(_request?: Request): URL {
  return new URL(
    OAUTH_PROTECTED_RESOURCE_METADATA_PATH,
    `${getWellKnownSiteOrigin()}/`,
  );
}
