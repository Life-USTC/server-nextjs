type SignInSearchParams = {
  callbackUrl?: string;
  error?: string;
  [key: string]: string | undefined;
};

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
