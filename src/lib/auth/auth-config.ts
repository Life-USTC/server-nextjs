import {
  getAuthEnv,
  getFirstOptionalTrimmedEnv,
  isNextProductionBuildPhase,
} from "@/env";
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";
import { getBetterAuthBaseUrl, getPublicOrigin } from "@/lib/site-url";

const authEnv = getAuthEnv();

export const isDevelopment = authEnv.NODE_ENV === "development";
export const isE2EDebugAuthEnabled = authEnv.E2E_DEBUG_AUTH === "1";
export const allowDebugAuth = isDevelopment || isE2EDebugAuthEnabled;

if (isE2EDebugAuthEnabled && authEnv.VERCEL === "1") {
  throw new Error(
    "E2E_DEBUG_AUTH must not be set on Vercel/production hosting",
  );
}

export const OIDC_ISSUER =
  authEnv.AUTH_OIDC_ISSUER ?? "https://sso-proxy.lug.ustc.edu.cn/auth/oauth2";
export const OIDC_DISCOVERY_URL = `${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`;
export const AUTH_BASE_URL = getBetterAuthBaseUrl();
export const AUTH_PUBLIC_ORIGIN = getPublicOrigin();
export const AUTH_PUBLIC_PROTOCOL = getAuthPublicProtocol(AUTH_PUBLIC_ORIGIN);
export const OAUTH_PROXY_SECRET = authEnv.OAUTH_PROXY_SECRET;
export const AUTH_GITHUB = getProviderCredentials(
  authEnv.AUTH_GITHUB_ID,
  authEnv.AUTH_GITHUB_SECRET,
);
export const AUTH_GOOGLE = getProviderCredentials(
  authEnv.AUTH_GOOGLE_ID,
  authEnv.AUTH_GOOGLE_SECRET,
);
export const AUTH_OIDC = {
  clientId: authEnv.AUTH_OIDC_CLIENT_ID ?? "",
  clientSecret: authEnv.AUTH_OIDC_CLIENT_SECRET ?? "",
};
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

function getProviderCredentials(
  clientId: string | undefined,
  clientSecret: string | undefined,
) {
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function getBetterAuthSecret() {
  const secret = getFirstOptionalTrimmedEnv(
    ["AUTH_SECRET", "BETTER_AUTH_SECRET"],
    authEnv,
  );
  if (secret) {
    return secret;
  }

  if (isNextProductionBuildPhase()) {
    return "life-ustc-next-build-placeholder-not-for-production";
  }

  if (authEnv.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET or BETTER_AUTH_SECRET is required");
  }

  return undefined;
}
