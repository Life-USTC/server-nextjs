import { oauthProvider } from "@better-auth/oauth-provider";
import type { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, jwt, oAuthProxy } from "better-auth/plugins";
import {
  AUTH_BASE_URL,
  AUTH_PUBLIC_ORIGIN,
  AUTH_PUBLIC_PROTOCOL,
  allowDebugAuth,
  getBetterAuthSecret,
  isDevelopment,
  OAUTH_PROVIDER_SCOPES,
  OAUTH_PROXY_SECRET,
  OIDC_DISCOVERY_URL,
  OIDC_ISSUER,
} from "@/lib/auth/auth-config";
import {
  getAuthAllowedHosts,
  getAuthTrustedOrigins,
  getOAuthProxyCurrentUrl,
  getOAuthProxyProductionUrl,
} from "@/lib/auth/auth-origins";
import { createBetterAuthPrismaAdapter } from "@/lib/auth/better-auth-prisma-adapter";
import {
  fallbackEmail,
  mapOidcProfileToUser,
  profileImage,
  profileName,
} from "@/lib/auth/oauth-profile";
import { webhookLoginPlugin } from "@/lib/auth/webhook-login-plugin";
import { prisma } from "@/lib/db/prisma";
import { logAppEvent } from "@/lib/log/app-logger";
import { isOAuthDebugLogging, logOAuthDebug } from "@/lib/log/oauth-debug";

export function buildBetterAuthOptions() {
  const options = {
    baseURL: {
      allowedHosts: getAuthAllowedHosts(),
      fallback: AUTH_PUBLIC_ORIGIN,
      protocol: AUTH_PUBLIC_PROTOCOL,
    },
    secret: getBetterAuthSecret(),
    database: createBetterAuthPrismaAdapter(prisma),
    disabledPaths: ["/token"],
    // Disable Better Auth's built-in rate limiting in debug/E2E mode so that
    // rapid sequential requests (e.g. /api/auth/get-session during tests)
    // don't get throttled with 429 responses.
    ...(allowDebugAuth ? { rateLimit: { enabled: false } } : {}),
    advanced: {
      // Reverse proxies should still forward the original scheme/host correctly
      // for request-aware Better Auth behavior, but deployment origin comes from config.
      trustedProxyHeaders: true,
    },
    trustedOrigins: getAuthTrustedOrigins(),
    socialProviders: {
      ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
        ? {
            github: {
              clientId: process.env.AUTH_GITHUB_ID,
              clientSecret: process.env.AUTH_GITHUB_SECRET,
              mapProfileToUser: (profile: {
                email?: string | null;
                id: string;
                name?: string;
                login?: string;
                avatar_url?: string;
              }) => {
                const hasEmail =
                  typeof profile.email === "string" && profile.email.length > 0;
                return {
                  email: hasEmail
                    ? profile.email
                    : fallbackEmail("github", profile.id),
                  name: profileName(profile.name ?? profile.login),
                  image: profileImage(profile.avatar_url),
                  // GitHub may return unverified or hidden emails; do not mark
                  // fallback/local emails as verified.
                  emailVerified: false,
                };
              },
            },
          }
        : {}),
      ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
        ? {
            google: {
              clientId: process.env.AUTH_GOOGLE_ID,
              clientSecret: process.env.AUTH_GOOGLE_SECRET,
              mapProfileToUser: (profile: {
                email?: string;
                sub: string;
                name?: string;
                picture?: string;
                email_verified?: boolean;
              }) => {
                const hasEmail =
                  typeof profile.email === "string" && profile.email.length > 0;
                return {
                  email: hasEmail
                    ? profile.email
                    : fallbackEmail("google", profile.sub),
                  name: profileName(profile.name),
                  image: profileImage(profile.picture),
                  emailVerified:
                    hasEmail && typeof profile.email_verified === "boolean"
                      ? profile.email_verified
                      : false,
                };
              },
            },
          }
        : {}),
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
        },
        isAdmin: {
          type: "boolean",
          defaultValue: false,
        },
        profilePictures: {
          type: "string[]",
          required: false,
          defaultValue: [],
        },
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        // User-initiated linking must support providers like USTC OIDC that do
        // not expose the user's email and therefore use a local fallback email.
        allowDifferentEmails: true,
      },
      fields: {
        providerId: "provider",
        accountId: "providerAccountId",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        scope: "scope",
        accessTokenExpiresAt: "accessTokenExpiresAt",
        refreshTokenExpiresAt: "refreshTokenExpiresAt",
        password: "password",
      },
    },
    session: {
      storeSessionInDatabase: true,
      fields: {
        token: "sessionToken",
        expiresAt: "expires",
        ipAddress: "ipAddress",
        userAgent: "userAgent",
      },
    },
    verification: {
      modelName: "verificationToken",
      fields: {
        value: "token",
        expiresAt: "expires",
      },
    },
    plugins: [
      jwt({
        jwt: {
          issuer: AUTH_BASE_URL.replace(/\/$/, ""),
        },
        schema: {
          jwks: {
            modelName: "Jwks",
          },
        },
      }),
      oAuthProxy({
        productionURL: getOAuthProxyProductionUrl(),
        currentURL: getOAuthProxyCurrentUrl(),
        ...(OAUTH_PROXY_SECRET ? { secret: OAUTH_PROXY_SECRET } : {}),
      }),
      webhookLoginPlugin(),
      oauthProvider({
        // Absolute URLs so redirects stay correct behind Docker/Caddy.
        loginPage: `${AUTH_PUBLIC_ORIGIN}/signin`,
        consentPage: `${AUTH_PUBLIC_ORIGIN}/oauth/authorize`,
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        rateLimit: allowDebugAuth
          ? {
              register: false,
            }
          : undefined,
        scopes: [...OAUTH_PROVIDER_SCOPES],
        clientRegistrationDefaultScopes: [...OAUTH_PROVIDER_SCOPES],
        clientRegistrationAllowedScopes: [...OAUTH_PROVIDER_SCOPES],
        validAudiences: [
          AUTH_PUBLIC_ORIGIN,
          `${AUTH_PUBLIC_ORIGIN}/api/mcp`,
          AUTH_BASE_URL.replace(/\/$/, ""),
        ],
        silenceWarnings: {
          oauthAuthServerConfig: true,
          openidConfig: true,
        },
        schema: {
          oauthClient: {
            modelName: "OAuthClient",
          },
          oauthAccessToken: {
            modelName: "OAuthAccessToken",
          },
          oauthRefreshToken: {
            modelName: "OAuthRefreshToken",
          },
          oauthConsent: {
            modelName: "OAuthConsent",
          },
        },
        advertisedMetadata: {
          scopes_supported: [...OAUTH_PROVIDER_SCOPES],
          claims_supported: [
            "sub",
            "name",
            "preferred_username",
            "picture",
            "email",
            "email_verified",
          ],
        },
        customUserInfoClaims({
          user,
          scopes,
        }: {
          user: Record<string, unknown>;
          scopes: string[];
        }) {
          const claims: Record<string, unknown> = {};
          if (scopes.includes("profile")) {
            const username = user.username;
            if (typeof username === "string" && username.length > 0) {
              claims.preferred_username = username;
            }
          }
          return claims;
        },
      }),
      genericOAuth({
        config: [
          {
            providerId: "oidc",
            discoveryUrl: OIDC_DISCOVERY_URL,
            issuer: OIDC_ISSUER,
            clientId: process.env.AUTH_OIDC_CLIENT_ID || "",
            clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET || "",
            scopes: ["openid"],
            pkce: true,
            mapProfileToUser: mapOidcProfileToUser,
          },
        ],
      }),
      nextCookies(),
    ],
    onAPIError: {
      onError(error: unknown) {
        if (isDevelopment) {
          logAppEvent(
            "error",
            "Better Auth API error",
            { source: "auth", event: "better-auth.api-error" },
            error,
          );
        }
        if (isOAuthDebugLogging()) {
          logOAuthDebug("better-auth.api-error", undefined, {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : "unknown",
          });
        }
      },
    },
  } satisfies Parameters<typeof betterAuth>[0];

  return options;
}
