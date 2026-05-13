type SignInSearchParams = {
  callbackUrl?: string;
  error?: string;
  [key: string]: string | undefined;
};

type AuthRedirectOptions = {
  redirectTo?: string;
  callbackUrl?: string;
};

export function resolveAuthRedirectTarget(
  options: AuthRedirectOptions,
  fallbackUrl = "/",
): string {
  return options.redirectTo ?? options.callbackUrl ?? fallbackUrl;
}

export function buildSignInPageUrl(callbackUrl: string) {
  return `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function buildSignInRedirectUrl(
  options: AuthRedirectOptions = {},
  fallbackUrl = "/",
) {
  return buildSignInPageUrl(resolveAuthRedirectTarget(options, fallbackUrl));
}

export function resolveSignInCallbackUrl(params: SignInSearchParams): string {
  if (typeof params.callbackUrl === "string" && params.callbackUrl.length > 0) {
    return params.callbackUrl;
  }

  const authorizeQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "callbackUrl" || key === "error") {
      continue;
    }
    if (typeof value === "string" && value.length > 0) {
      authorizeQuery.set(key, value);
    }
  }

  if (!authorizeQuery.has("client_id") || !authorizeQuery.has("redirect_uri")) {
    return "/";
  }

  return `/oauth/authorize?${authorizeQuery.toString()}`;
}

export function isOAuthCallbackContinuation(url: URL): boolean {
  const hasState = url.searchParams.has("state");
  const hasResult =
    url.searchParams.has("code") || url.searchParams.has("error");
  return hasState && hasResult;
}

export function shouldRedirectIncompleteProfileToWelcome({
  pathname,
  url,
  hasUser,
  hasCompleteProfile,
}: {
  pathname: string;
  url: URL;
  hasUser: boolean;
  hasCompleteProfile: boolean;
}) {
  if (!hasUser || hasCompleteProfile) {
    return false;
  }

  if (
    pathname === "/welcome" ||
    pathname === "/signin" ||
    pathname.startsWith("/oauth/") ||
    isOAuthCallbackContinuation(url)
  ) {
    return false;
  }

  return true;
}
