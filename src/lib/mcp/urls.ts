import {
  getBetterAuthBaseUrl as getConfiguredBetterAuthBaseUrl,
  getPublicOrigin,
} from "@/lib/site-url";

export const MCP_ROUTE_PATH = "/api/mcp";
export const OAUTH_AUTHORIZATION_PATH = "/api/auth/oauth2/authorize";
export const OAUTH_REGISTRATION_PATH = "/api/auth/oauth2/register";
export const OAUTH_TOKEN_PATH = "/api/auth/oauth2/token";
export const OAUTH_OPENID_CONFIGURATION_PATH =
  "/.well-known/openid-configuration";
export const OAUTH_ISSUER_PATH = "/api/auth";

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function insertWellKnownPath(target: URL | string, suffix: string): URL {
  const url = new URL(target.toString());
  const normalizedPathname = normalizePathname(url.pathname);
  return new URL(
    `/.well-known/${suffix}${normalizedPathname}${url.search}`,
    `${url.origin}/`,
  );
}

function appendWellKnownPath(target: URL | string, suffix: string): URL {
  const url = new URL(target.toString());
  const normalizedPathname = normalizePathname(url.pathname);
  return new URL(
    `${normalizedPathname}/.well-known/${suffix}${url.search}`,
    `${url.origin}/`,
  );
}

/**
 * Canonical Better Auth public base (no trailing slash). Must match `AUTH_BASE_URL` in `auth.ts`
 * so JWT `iss` / `aud` line up with MCP verification and metadata.
 */
export function getBetterAuthBaseUrl(): string {
  return getConfiguredBetterAuthBaseUrl();
}

/** Public origin for non-auth routes on the current deployment. */
export function getSiteOrigin(): string {
  return getPublicOrigin();
}

/**
 * OAuth resource indicator / access-token audience for MCP. This is the public
 * MCP endpoint, not a Better Auth route under `/api/auth`.
 */
export function getOAuthMcpResourceUrl(): string {
  return `${getSiteOrigin()}${MCP_ROUTE_PATH}`;
}

export function getJwksUrlForOAuthVerification(): string {
  return new URL("/api/auth/jwks", `${getBetterAuthBaseUrl()}/`).toString();
}

export function getMcpServerUrl(_request?: Request): URL {
  return new URL(getOAuthMcpResourceUrl());
}

export function getOAuthIssuerUrl(_request?: Request): URL {
  return new URL(OAUTH_ISSUER_PATH, `${getSiteOrigin()}/`);
}

export function getOAuthAuthorizationServerMetadataUrl(
  _request?: Request,
): URL {
  return insertWellKnownPath(getOAuthIssuerUrl(), "oauth-authorization-server");
}

export function getOAuthProtectedResourceMetadataUrl(_request?: Request): URL {
  return insertWellKnownPath(getMcpServerUrl(), "oauth-protected-resource");
}

export function getOAuthOpenIdConfigurationUrl(_request?: Request): URL {
  return appendWellKnownPath(getOAuthIssuerUrl(), "openid-configuration");
}

export function getOAuthOpenIdConfigurationCompatibilityUrl(
  _request?: Request,
): URL {
  return insertWellKnownPath(getOAuthIssuerUrl(), "openid-configuration");
}
