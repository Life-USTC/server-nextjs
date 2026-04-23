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

export function getOAuthProxyProductionUrl(): string {
  return getCanonicalOrigin();
}

export function getOAuthProxyCurrentUrl(): string {
  return getPublicOrigin();
}

export function getOAuthProxySecret(): string | undefined {
  const configured = process.env.OAUTH_PROXY_SECRET?.trim();
  return configured && configured.length > 0 ? configured : undefined;
}
