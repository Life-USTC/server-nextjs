import { getOAuthProxySecret } from "@/lib/auth/auth-origins";
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";
import { getBetterAuthBaseUrl, getPublicOrigin } from "@/lib/site-url";

const NEXT_PRODUCTION_BUILD_PHASE = "phase-production-build";

export const isDevelopment = process.env.NODE_ENV === "development";
export const isE2EDebugAuthEnabled = process.env.E2E_DEBUG_AUTH === "1";
export const allowDebugAuth = isDevelopment || isE2EDebugAuthEnabled;

if (isE2EDebugAuthEnabled && process.env.VERCEL === "1") {
  throw new Error(
    "E2E_DEBUG_AUTH must not be set on Vercel/production hosting",
  );
}

export const OIDC_ISSUER =
  process.env.AUTH_OIDC_ISSUER ||
  "https://sso-proxy.lug.ustc.edu.cn/auth/oauth2";
export const OIDC_DISCOVERY_URL = `${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`;
export const AUTH_BASE_URL = getBetterAuthBaseUrl();
export const AUTH_PUBLIC_ORIGIN = getPublicOrigin();
export const AUTH_PUBLIC_PROTOCOL = getAuthPublicProtocol(AUTH_PUBLIC_ORIGIN);
export const OAUTH_PROXY_SECRET = getOAuthProxySecret();
export const OAUTH_PROVIDER_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  MCP_TOOLS_SCOPE,
] as const;

function getAuthPublicProtocol(origin: string): "http" | "https" {
  const protocol = new URL(origin).protocol;
  if (protocol === "http:" || protocol === "https:") {
    return protocol.slice(0, -1) as "http" | "https";
  }
  throw new Error(`Unsupported auth origin protocol: ${protocol}`);
}

export function getBetterAuthSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE) {
    return "life-ustc-next-build-placeholder-not-for-production";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or BETTER_AUTH_SECRET is required");
  }

  return undefined;
}
