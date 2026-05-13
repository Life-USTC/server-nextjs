import { getOptionalTrimmedEnv } from "@/env";
import { getCanonicalOrigin, getPublicOrigin } from "@/lib/site-url";

const LOCALHOST_DEV_PORT = 3000;
const LOCALHOST_AUTH_ORIGINS = [
  `http://localhost:${LOCALHOST_DEV_PORT}`,
  `http://127.0.0.1:${LOCALHOST_DEV_PORT}`,
];
const VERCEL_PREVIEW_AUTH_ORIGIN = "https://*.vercel.app";

export function getAuthTrustedOrigins(): string[] {
  return Array.from(
    new Set([
      getPublicOrigin(),
      getCanonicalOrigin(),
      ...LOCALHOST_AUTH_ORIGINS,
      VERCEL_PREVIEW_AUTH_ORIGIN,
    ]),
  );
}

export function getAuthAllowedHosts(): string[] {
  return Array.from(
    new Set(
      [
        getPublicOrigin(),
        getCanonicalOrigin(),
        ...LOCALHOST_AUTH_ORIGINS,
        VERCEL_PREVIEW_AUTH_ORIGIN,
      ].map((origin) => {
        if (origin.includes("://")) {
          return new URL(origin).host;
        }
        return origin.replace(/^https?:\/\//, "");
      }),
    ),
  );
}

function isWildcardOriginPattern(origin: string) {
  return origin.includes("://*.");
}

function matchesTrustedOrigin(origin: string, trustedOrigin: string) {
  if (!isWildcardOriginPattern(trustedOrigin)) {
    return origin === trustedOrigin;
  }

  const protocolSeparator = trustedOrigin.indexOf("://");
  const trustedProtocol = trustedOrigin.slice(0, protocolSeparator);
  const trustedHostPattern = trustedOrigin.slice(protocolSeparator + 3);
  const trustedHostSuffix = trustedHostPattern.slice(1);

  const url = new URL(origin);
  return (
    url.protocol === `${trustedProtocol}:` &&
    url.hostname.endsWith(trustedHostSuffix) &&
    url.hostname.length > trustedHostSuffix.length
  );
}

export function isTrustedAuthOrigin(origin: string): boolean {
  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  return getAuthTrustedOrigins().some((trustedOrigin) =>
    matchesTrustedOrigin(normalizedOrigin, trustedOrigin),
  );
}

export function getOAuthProxyProductionUrl(): string {
  return getCanonicalOrigin();
}

export function getOAuthProxyCurrentUrl(): string {
  return getPublicOrigin();
}

export function getOAuthProxySecret(): string | undefined {
  return getOptionalTrimmedEnv("OAUTH_PROXY_SECRET");
}
