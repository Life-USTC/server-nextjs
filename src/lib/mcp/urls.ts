import { getBetterAuthBaseUrl, getPublicOrigin } from "@/lib/site-url";

export const MCP_ROUTE_PATH = "/api/mcp";
export const OAUTH_AUTHORIZATION_PATH = "/api/auth/oauth2/authorize";
export const OAUTH_REGISTRATION_PATH = "/api/auth/oauth2/register";
export const OAUTH_TOKEN_PATH = "/api/auth/oauth2/token";
export const OAUTH_OPENID_CONFIGURATION_PATH =
  "/.well-known/openid-configuration";

function uniqueUrls(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\/$/, "")))];
}

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
 * OAuth resource indicator / access-token audience for MCP. This is the public
 * MCP endpoint, not a Better Auth route under `/api/auth`.
 */
export function getOAuthMcpResourceUrl(): string {
  return `${getPublicOrigin()}${MCP_ROUTE_PATH}`;
}

export function getCanonicalOAuthIssuer(): string {
  return getBetterAuthBaseUrl();
}

export function getOAuthTokenVerificationIssuers(): string[] {
  return uniqueUrls([getCanonicalOAuthIssuer(), getPublicOrigin()]);
}

export function getOAuthRestAudienceUrls(): string[] {
  return uniqueUrls([getPublicOrigin(), getCanonicalOAuthIssuer()]);
}

export function getOAuthMcpAudienceUrls(): string[] {
  const issuer = getCanonicalOAuthIssuer();
  return uniqueUrls([
    getOAuthMcpResourceUrl(),
    `${issuer}/oauth2/userinfo`,
    issuer,
  ]);
}

export function getOAuthProviderValidAudiences(): string[] {
  return uniqueUrls([...getOAuthRestAudienceUrls(), getOAuthMcpResourceUrl()]);
}

export function getJwksUrlForOAuthVerification(): string {
  return new URL("/api/auth/jwks", `${getCanonicalOAuthIssuer()}/`).toString();
}

export function getMcpServerUrl(_request?: Request): URL {
  return new URL(getOAuthMcpResourceUrl());
}

export function getOAuthIssuerUrl(_request?: Request): URL {
  return new URL(getCanonicalOAuthIssuer());
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
