export const OAUTH_PUBLIC_CLIENT_AUTH_METHOD = "none";
export const OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD = "client_secret_basic";
export const OAUTH_CLIENT_SECRET_POST_AUTH_METHOD = "client_secret_post";
export const MCP_TOOLS_SCOPE = "mcp:tools";
export const DEFAULT_OAUTH_CLIENT_SCOPES = ["openid", "profile"] as const;
export type SupportedOAuthClientAuthMethod =
  | typeof OAUTH_PUBLIC_CLIENT_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_BASIC_AUTH_METHOD
  | typeof OAUTH_CLIENT_SECRET_POST_AUTH_METHOD;

export function normalizeResourceIndicator(value: string | URL): string {
  const parsed = new URL(value);

  if (parsed.hash) {
    throw new TypeError("Resource indicators must not include fragments");
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port =
    parsed.port &&
    !(
      (protocol === "https:" && parsed.port === "443") ||
      (protocol === "http:" && parsed.port === "80")
    )
      ? `:${parsed.port}`
      : "";
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname;

  return `${protocol}//${hostname}${port}${pathname}${parsed.search}`;
}

export function resourceIndicatorsMatch(
  left: string | URL,
  right: string | URL,
): boolean {
  return normalizeResourceIndicator(left) === normalizeResourceIndicator(right);
}
