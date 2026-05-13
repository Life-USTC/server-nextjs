"use client";

import {
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useMemo } from "react";
import {
  buildSignInRedirectUrl,
  resolveAuthRedirectTarget,
} from "@/lib/auth/auth-routing";
import { resolveAuthProviderDecision } from "@/lib/auth/provider-ids";
import { normalizeSessionUser } from "@/lib/auth/session";

const FRESH_SESSION_QUERY = { disableCookieCache: true } as const;

export function getFreshSessionQuery() {
  return FRESH_SESSION_QUERY;
}

export async function refreshAuthSessionCookieCache() {
  await fetch("/api/auth/get-session?disableCookieCache=true", {
    cache: "no-store",
  });
}

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    inferAdditionalFields({
      user: {
        username: {
          type: "string",
          required: false,
        },
        isAdmin: {
          type: "boolean",
        },
        profilePictures: {
          type: "string[]",
          required: false,
        },
      },
    }),
  ],
});

type ClientSession = {
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

type ClientSignInOptions = {
  callbackUrl?: string;
  redirectTo?: string;
  redirect?: boolean;
};

type ClientSignOutOptions = {
  callbackUrl?: string;
  redirectTo?: string;
  redirect?: boolean;
};

export function useSession() {
  const { data, isPending, error, refetch } = authClient.useSession();

  const mapped = useMemo<ClientSession | null>(() => {
    if (!data) {
      return null;
    }

    return {
      user: normalizeSessionUser(
        data.user as Record<string, unknown> & { id: string; email: string },
      ),
    };
  }, [data]);

  return {
    data: mapped,
    status: isPending
      ? ("loading" as const)
      : mapped
        ? ("authenticated" as const)
        : ("unauthenticated" as const),
    error,
    update: async () => {
      await refetch({
        query: getFreshSessionQuery(),
      });
    },
  };
}

const getCurrentUrl = () =>
  typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}`
    : "/";

const getCallbackUrl = (options: ClientSignInOptions | ClientSignOutOptions) =>
  resolveAuthRedirectTarget(options, getCurrentUrl());

function maybeRedirect<T extends { data?: { url?: string } | null }>(
  result: T,
  options: ClientSignInOptions | ClientSignOutOptions,
): T {
  const redirectUrl = result.data?.url;
  if (options.redirect !== false && redirectUrl) {
    window.location.href = redirectUrl;
  }
  return result;
}

export async function signIn(
  providerId?: string,
  options: ClientSignInOptions = {},
) {
  const callbackURL = getCallbackUrl(options);
  const decision = resolveAuthProviderDecision(providerId);

  if (decision.kind === "none") {
    const url = buildSignInRedirectUrl(options, callbackURL);
    if (options.redirect !== false) {
      window.location.href = url;
    }
    return { data: { url, redirect: false }, error: null };
  }

  if (decision.kind === "oidc") {
    const result = await authClient.signIn.oauth2({
      providerId: decision.providerId,
      callbackURL,
      disableRedirect: true,
    });
    return maybeRedirect(result, options);
  }

  const result = await authClient.signIn.social({
    provider: decision.providerId,
    callbackURL,
    disableRedirect: true,
  });
  return maybeRedirect(result, options);
}

export async function linkAccount(
  providerId: string,
  options: ClientSignInOptions = {},
) {
  const callbackURL = getCallbackUrl(options);
  const decision = resolveAuthProviderDecision(providerId);

  if (decision.kind === "none") {
    throw new Error("providerId is required");
  }

  if (decision.kind === "oidc") {
    const result = await authClient.oauth2.link({
      providerId: decision.providerId,
      callbackURL,
    });
    return maybeRedirect(result, options);
  }

  const result = await authClient.linkSocial({
    provider: decision.providerId,
    callbackURL,
    disableRedirect: true,
  });
  return maybeRedirect(result, options);
}

export async function signOut(options: ClientSignOutOptions = {}) {
  const result = await authClient.signOut();
  const callbackURL = getCallbackUrl(options);
  if (options.redirect !== false) {
    window.location.href = callbackURL || "/";
  }
  return result;
}
