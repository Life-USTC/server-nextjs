"use client";

import {
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useMemo } from "react";

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

    const user = data.user as Record<string, unknown>;
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || null,
        image: data.user.image ?? null,
        username:
          typeof user.username === "string" && user.username.length > 0
            ? user.username
            : null,
        isAdmin: Boolean(user.isAdmin),
        profilePictures: Array.isArray(user.profilePictures)
          ? user.profilePictures.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
      },
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
        query: {
          disableCookieCache: true,
        },
      });
    },
  };
}

const getCallbackUrl = (options: ClientSignInOptions | ClientSignOutOptions) =>
  options.redirectTo ??
  options.callbackUrl ??
  (typeof window !== "undefined"
    ? `${window.location.pathname}${window.location.search}`
    : "/");

export async function signIn(
  providerId?: string,
  options: ClientSignInOptions = {},
) {
  const callbackURL = getCallbackUrl(options);
  if (!providerId) {
    const url = `/signin?callbackUrl=${encodeURIComponent(callbackURL)}`;
    if (options.redirect !== false) {
      window.location.href = url;
    }
    return { data: { url, redirect: false }, error: null };
  }

  if (providerId === "oidc") {
    const result = await authClient.signIn.oauth2({
      providerId: "oidc",
      callbackURL,
      disableRedirect: true,
    });
    const redirectUrl = result.data?.url;
    if (options.redirect !== false && redirectUrl) {
      window.location.href = redirectUrl;
    }
    return result;
  }

  const result = await authClient.signIn.social({
    provider: providerId,
    callbackURL,
    disableRedirect: true,
  });
  const redirectUrl = result.data?.url;
  if (options.redirect !== false && redirectUrl) {
    window.location.href = redirectUrl;
  }
  return result;
}

export async function signOut(options: ClientSignOutOptions = {}) {
  const result = await authClient.signOut();
  const callbackURL = getCallbackUrl(options);
  if (options.redirect !== false) {
    window.location.href = callbackURL || "/";
  }
  return result;
}
