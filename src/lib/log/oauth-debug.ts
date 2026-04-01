/**
 * Opt-in OAuth / HTTP tracing for production debugging (dev-server–style visibility).
 *
 * - `OAUTH_DEBUG_LOGGING=1` — log `/api/auth/oauth2/*`, sanitized redirects, authorize summary; log `/api/mcp`.
 * - `OAUTH_DEBUG_LOGGING=verbose` (or `2`) — also log all other `/api/auth/*` routes.
 *
 * Never logs secrets, authorization codes, refresh tokens, access tokens, or cookies.
 */

import { formatShanghaiTimestamp } from "@/lib/time/shanghai-format";

export type OAuthDebugMode = "off" | "standard" | "verbose";

export function getOAuthDebugMode(): OAuthDebugMode {
  const v = (process.env.OAUTH_DEBUG_LOGGING ?? "").trim().toLowerCase();
  if (!v || v === "0" || v === "false") return "off";
  if (v === "verbose" || v === "2") return "verbose";
  return "standard";
}

export function isOAuthDebugLogging(): boolean {
  return getOAuthDebugMode() !== "off";
}

export function isOAuthDebugVerbose(): boolean {
  return getOAuthDebugMode() === "verbose";
}

export function oauthDebugCorrelationId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("cf-ray") ??
    request.headers.get("traceparent")?.slice(0, 55) ??
    "no-correlation-id"
  );
}

const SENSITIVE_QUERY_KEYS = new Set([
  "code",
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "session",
  "session_token",
  "client_secret",
]);

/** Redact sensitive query parameters in a redirect URL for logs. */
export function sanitizeOAuthRedirectLocation(
  location: string | undefined,
  requestUrl: string,
): string | null {
  if (!location) return null;
  try {
    const u = new URL(location, requestUrl);
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.set(key, "[REDACTED]");
      }
    }
    return u.toString();
  } catch {
    return location.length > 240 ? `${location.slice(0, 240)}…` : location;
  }
}

function summarizeOAuthAuthorizeUrl(url: URL): Record<string, unknown> | null {
  if (!url.pathname.endsWith("/oauth2/authorize")) return null;
  const sp = url.searchParams;
  const redirect = sp.get("redirect_uri");
  let redirectHost: string | null = null;
  if (redirect) {
    try {
      redirectHost = new URL(redirect).host;
    } catch {
      redirectHost = "invalid_redirect_uri";
    }
  }
  const scope = sp.get("scope");
  return {
    clientIdPrefix: sp.get("client_id")?.slice(0, 16) ?? null,
    redirectHost,
    scopeTokenCount: scope ? scope.split(" ").filter(Boolean).length : 0,
    resource: sp.get("resource"),
    statePresent: Boolean(sp.get("state")),
    codeChallengeMethod: sp.get("code_challenge_method"),
    prompt: sp.get("prompt"),
  };
}

export function logOAuthDebug(
  event: string,
  request: Request | undefined,
  fields: Record<string, unknown>,
): void {
  if (!isOAuthDebugLogging()) return;

  const payload: Record<string, unknown> = {
    ts: formatShanghaiTimestamp(new Date()),
    event,
    ...fields,
  };

  if (request) {
    payload.correlationId = oauthDebugCorrelationId(request);
  }

  console.info(JSON.stringify(payload));
}

function shouldLogBetterAuthPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/auth")) return false;
  if (isOAuthDebugVerbose()) return true;
  return pathname.includes("/oauth2");
}

/**
 * Wrap Better Auth App Router handlers to log oauth2 (or all /api/auth in verbose mode).
 */
export async function withBetterAuthOAuthDebug(
  method: string,
  request: Request,
  run: (req: Request) => Promise<Response>,
): Promise<Response> {
  if (!isOAuthDebugLogging()) {
    return run(request);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (!shouldLogBetterAuthPath(path)) {
    return run(request);
  }

  const correlationId = oauthDebugCorrelationId(request);
  const start = Date.now();

  const authorizeSummary =
    method === "GET" ? summarizeOAuthAuthorizeUrl(url) : null;

  logOAuthDebug("better-auth.request", request, {
    method,
    path,
    queryKeys: [...url.searchParams.keys()],
    ...(authorizeSummary ? { authorizeSummary } : {}),
  });

  try {
    const res = await run(request);
    const location = res.headers.get("location");
    const redirectTo =
      res.status >= 300 && res.status < 400
        ? sanitizeOAuthRedirectLocation(location ?? undefined, request.url)
        : null;

    logOAuthDebug("better-auth.response", undefined, {
      correlationId,
      method,
      path,
      status: res.status,
      ms: Date.now() - start,
      ...(redirectTo ? { redirectTo } : {}),
      ...(location && !redirectTo ? { locationPresent: true } : {}),
    });
    return res;
  } catch (err) {
    logOAuthDebug("better-auth.error", undefined, {
      correlationId,
      method,
      path,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
