export const MCP_ROUTE_PATH = "/api/mcp";
export const OAUTH_AUTHORIZATION_PATH = "/oauth/authorize";
export const OAUTH_TOKEN_PATH = "/api/oauth/token";
export const OAUTH_AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";
export const OAUTH_PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/api/mcp";

export function getRequestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export function getMcpServerUrl(request: Request): URL {
  return new URL(MCP_ROUTE_PATH, request.url);
}

export function getOAuthIssuerUrl(request: Request): URL {
  return new URL(getRequestOrigin(request));
}

export function getOAuthAuthorizationServerMetadataUrl(request: Request): URL {
  return new URL(OAUTH_AUTHORIZATION_SERVER_METADATA_PATH, request.url);
}

export function getOAuthProtectedResourceMetadataUrl(request: Request): URL {
  return new URL(OAUTH_PROTECTED_RESOURCE_METADATA_PATH, request.url);
}
