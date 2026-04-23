const FRESH_SESSION_QUERY = { disableCookieCache: true } as const;

export function getFreshSessionQuery() {
  return FRESH_SESSION_QUERY;
}

export async function refreshAuthSessionCookieCache() {
  await fetch("/api/auth/get-session?disableCookieCache=true", {
    cache: "no-store",
  });
}
