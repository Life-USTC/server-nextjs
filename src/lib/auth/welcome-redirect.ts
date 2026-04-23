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
