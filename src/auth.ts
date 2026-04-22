import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { hashPassword } from "better-auth/crypto";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { genericOAuth, jwt, oAuthProxy } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import {
  getAuthTrustedOrigins,
  getOAuthProxyProductionUrl,
  getOAuthProxySecret,
} from "@/lib/auth/auth-origins";
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
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";
import { getBetterAuthBaseUrl, getPublicOrigin } from "@/lib/site-url";

const isDev = process.env.NODE_ENV === "development";
const e2eDebugAuth = process.env.E2E_DEBUG_AUTH === "1";
const allowDebugAuth = isDev || e2eDebugAuth;

if (e2eDebugAuth && process.env.VERCEL === "1") {
  throw new Error(
    "E2E_DEBUG_AUTH must not be set on Vercel/production hosting",
  );
}

const DEV_DEBUG_PROVIDER_ID = "dev-debug";
const DEV_ADMIN_PROVIDER_ID = "dev-admin";
const DEV_DEBUG_USERNAME =
  process.env.DEV_DEBUG_USERNAME?.trim().toLowerCase() || "dev-user";
const DEV_DEBUG_NAME = process.env.DEV_DEBUG_NAME?.trim() || "Dev Debug User";

const DEV_ADMIN_USERNAME =
  process.env.DEV_ADMIN_USERNAME?.trim().toLowerCase() || "dev-admin";
const DEV_ADMIN_NAME = process.env.DEV_ADMIN_NAME?.trim() || "Dev Admin User";
const DEV_DEBUG_EMAIL =
  process.env.DEV_DEBUG_EMAIL?.trim().toLowerCase() ||
  `${DEV_DEBUG_USERNAME}@debug.local`;
const DEV_ADMIN_EMAIL =
  process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase() ||
  `${DEV_ADMIN_USERNAME}@debug.local`;

const DEV_DEBUG_PASSWORD = (() => {
  const v = process.env.DEV_DEBUG_PASSWORD?.trim();
  if (allowDebugAuth && !isDev) {
    if (!v) {
      throw new Error(
        "DEV_DEBUG_PASSWORD is required when E2E_DEBUG_AUTH=1 (non-development NODE_ENV)",
      );
    }
    return v;
  }
  return v || "dev-debug-password";
})();

const DEV_ADMIN_PASSWORD = (() => {
  const v = process.env.DEV_ADMIN_PASSWORD?.trim();
  if (allowDebugAuth && !isDev) {
    if (!v) {
      throw new Error(
        "DEV_ADMIN_PASSWORD is required when E2E_DEBUG_AUTH=1 (non-development NODE_ENV)",
      );
    }
    return v;
  }
  return v || "dev-admin-password";
})();

const OIDC_ISSUER =
  process.env.AUTH_OIDC_ISSUER ||
  "https://sso-proxy.lug.ustc.edu.cn/auth/oauth2";
const OIDC_DISCOVERY_URL = `${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`;
const AUTH_BASE_URL = getBetterAuthBaseUrl();
/** Site origin (scheme + host) for UI routes like /signin and /oauth/authorize. */
const AUTH_PUBLIC_ORIGIN = getPublicOrigin();
const NEXT_PRODUCTION_BUILD_PHASE = "phase-production-build";
const OAUTH_PROXY_SECRET = getOAuthProxySecret();
const OAUTH_PROVIDER_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  MCP_TOOLS_SCOPE,
] as const;

function getBetterAuthSecret() {
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

const authInstance = betterAuth({
  baseURL: AUTH_BASE_URL,
  secret: getBetterAuthSecret(),
  database: prismaAdapter(
    prisma as unknown as Parameters<typeof prismaAdapter>[0],
    {
      provider: "postgresql",
    },
  ),
  disabledPaths: ["/token"],
  advanced: {
    // Reverse proxies should still forward the original scheme/host correctly for
    // request-aware Better Auth behavior, but deployment origin comes from config.
    trustedProxyHeaders: true,
  },
  trustedOrigins: getAuthTrustedOrigins(),
  socialProviders: {
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? {
          github: {
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            mapProfileToUser: (profile) => {
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
            mapProfileToUser: (profile) => {
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
      ...(OAUTH_PROXY_SECRET ? { secret: OAUTH_PROXY_SECRET } : {}),
    }),
    webhookLoginPlugin(),
    oauthProvider({
      // Absolute URLs so redirects stay correct behind Docker/Caddy (avoid https://localhost:3000/...).
      loginPage: `${AUTH_PUBLIC_ORIGIN}/signin`,
      consentPage: `${AUTH_PUBLIC_ORIGIN}/oauth/authorize`,
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      rateLimit: e2eDebugAuth
        ? {
            register: false,
          }
        : undefined,
      scopes: [...OAUTH_PROVIDER_SCOPES],
      clientRegistrationDefaultScopes: [...OAUTH_PROVIDER_SCOPES],
      clientRegistrationAllowedScopes: [...OAUTH_PROVIDER_SCOPES],
      validAudiences: [
        // Use URL-normalized origin (strips invisible chars / trailing slashes
        // that raw env values may carry).  Keep the raw value too for safety.
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
      customUserInfoClaims({ user, scopes }) {
        const claims: Record<string, unknown> = {};
        if (scopes.includes("profile")) {
          const username = (user as { username?: unknown }).username;
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
    onError(error) {
      if (isDev) {
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
});

type RawSession = Awaited<ReturnType<typeof authInstance.api.getSession>>;

export type AppSession = RawSession extends null
  ? never
  : {
      session: NonNullable<RawSession>["session"];
      user: {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
        username: string | null;
        isAdmin: boolean;
        profilePictures: string[];
      };
    };

export const handlers = toNextJsHandler(authInstance);
export const authApi = authInstance.api;
export const betterAuthInstance = authInstance;

const mapSession = (session: NonNullable<RawSession>): AppSession => {
  const user = session.user as Record<string, unknown>;
  const profilePictures = Array.isArray(user.profilePictures)
    ? user.profilePictures.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return {
    session: session.session,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || null,
      image: session.user.image ?? null,
      username:
        typeof user.username === "string" && user.username.length > 0
          ? user.username
          : null,
      isAdmin: Boolean(user.isAdmin),
      profilePictures,
    },
  };
};

export async function auth(
  source?: Request | Headers,
): Promise<AppSession | null> {
  const requestHeaders =
    source instanceof Headers
      ? source
      : source
        ? new Headers(source.headers)
        : await headers();

  const session = await authInstance.api.getSession({
    headers: requestHeaders,
  });
  if (!session) {
    return null;
  }
  return mapSession(session);
}

type SignInOptions = {
  redirectTo?: string;
  callbackUrl?: string;
  redirect?: boolean;
};

type SignOutOptions = {
  redirectTo?: string;
  callbackUrl?: string;
  redirect?: boolean;
};

type DebugProviderConfig = {
  username: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  image: string;
};

const getDebugProviderConfig = (
  providerId: string,
): DebugProviderConfig | null => {
  if (providerId === DEV_DEBUG_PROVIDER_ID) {
    return {
      username: DEV_DEBUG_USERNAME,
      name: DEV_DEBUG_NAME,
      email: DEV_DEBUG_EMAIL,
      password: DEV_DEBUG_PASSWORD,
      isAdmin: false,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev",
    };
  }
  if (providerId === DEV_ADMIN_PROVIDER_ID) {
    return {
      username: DEV_ADMIN_USERNAME,
      name: DEV_ADMIN_NAME,
      email: DEV_ADMIN_EMAIL,
      password: DEV_ADMIN_PASSWORD,
      isAdmin: true,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=life-ustc-dev-admin",
    };
  }
  return null;
};

const ensureDebugCredentialUser = async (providerId: string) => {
  const config = getDebugProviderConfig(providerId);
  if (!config) {
    throw new Error(`Unknown debug provider: ${providerId}`);
  }

  const hashedPassword = await hashPassword(config.password);
  const userData = {
    username: config.username,
    email: config.email,
    emailVerified: true,
    name: config.name,
    image: config.image,
    isAdmin: config.isAdmin,
    profilePictures: [config.image],
  };

  const upsertDebugUserByIdentity = async () => {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: config.username }, { email: config.email }],
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          ...userData,
          profilePictures: { set: userData.profilePictures },
        },
        select: { id: true },
      });
    }

    return prisma.user.create({
      data: userData,
      select: { id: true },
    });
  };

  let user: { id: string };
  try {
    user = await upsertDebugUserByIdentity();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      user = await upsertDebugUserByIdentity();
    } else {
      throw error;
    }
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credential",
        providerAccountId: user.id,
      },
    },
    update: {
      userId: user.id,
      type: "credential",
      provider: "credential",
      password: hashedPassword,
    },
    create: {
      userId: user.id,
      type: "credential",
      provider: "credential",
      providerAccountId: user.id,
      password: hashedPassword,
    },
  });
};

const extractResultUrl = (result: unknown): string | null => {
  if (!result || typeof result !== "object") {
    return null;
  }
  const value = (result as { url?: unknown }).url;
  return typeof value === "string" && value.length > 0 ? value : null;
};

export async function signIn(providerId?: string, options: SignInOptions = {}) {
  const redirectTo = options.redirectTo ?? options.callbackUrl ?? "/";

  if (!providerId) {
    const signInUrl = `/signin?callbackUrl=${encodeURIComponent(redirectTo)}`;
    if (options.redirect === false) {
      return { redirect: false, url: signInUrl };
    }
    redirect(signInUrl);
  }

  let result: unknown;

  if (
    providerId === DEV_DEBUG_PROVIDER_ID ||
    providerId === DEV_ADMIN_PROVIDER_ID
  ) {
    if (!allowDebugAuth) {
      throw new Error("Debug auth is disabled");
    }
    await ensureDebugCredentialUser(providerId);
    const debugConfig = getDebugProviderConfig(providerId);
    result = await authInstance.api.signInEmail({
      body: {
        email: debugConfig?.email ?? "",
        password: debugConfig?.password ?? "",
        callbackURL: redirectTo,
      },
    });
  } else if (providerId === "oidc") {
    result = await authInstance.api.signInWithOAuth2({
      body: {
        providerId,
        callbackURL: redirectTo,
      },
    });
  } else {
    result = await authInstance.api.signInSocial({
      body: {
        provider: providerId,
        callbackURL: redirectTo,
      },
    });
  }

  if (options.redirect === false) {
    return result;
  }

  redirect(extractResultUrl(result) ?? redirectTo);
}

export async function signOut(options: SignOutOptions = {}) {
  await authInstance.api.signOut({
    headers: await headers(),
  });

  const redirectTo = options.redirectTo ?? options.callbackUrl ?? "/";
  if (options.redirect === false) {
    return { success: true };
  }
  redirect(redirectTo);
}
