export function buildOAuthErrorRedirectUri({
  redirectUri,
  error,
  state,
  errorDescription,
}: {
  redirectUri: string;
  error: string;
  state?: string;
  errorDescription?: string;
}): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) {
    url.searchParams.set("state", state);
  }
  if (errorDescription) {
    url.searchParams.set("error_description", errorDescription);
  }
  return url.toString();
}
