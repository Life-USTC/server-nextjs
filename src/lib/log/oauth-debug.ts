/**
 * Opt-in OAuth / Better Auth request tracing for production debugging.
 *
 * Enable with `OAUTH_DEBUG_LOGGING=1`. Logs one JSON object per line to stdout
 * (picked up by Docker / systemd / platform log collectors).
 *
 * Never logs secrets, authorization codes, refresh tokens, or bearer tokens.
 */

export function isOAuthDebugLogging(): boolean {
  return process.env.OAUTH_DEBUG_LOGGING === "1";
}

export function oauthDebugCorrelationId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("cf-ray") ??
    request.headers.get("traceparent")?.slice(0, 55) ??
    "no-correlation-id"
  );
}

export function logOAuthDebug(
  event: string,
  request: Request | undefined,
  fields: Record<string, unknown>,
): void {
  if (!isOAuthDebugLogging()) return;

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };

  if (request) {
    payload.correlationId = oauthDebugCorrelationId(request);
  }

  console.info(JSON.stringify(payload));
}

function shouldLogAuthPath(pathname: string): boolean {
  return pathname.includes("/oauth2");
}

/**
 * Wrap Better Auth App Router handlers to log oauth2 subpaths only.
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

  if (!shouldLogAuthPath(path)) {
    return run(request);
  }

  const correlationId = oauthDebugCorrelationId(request);
  const start = Date.now();

  logOAuthDebug("better-auth.request", request, {
    method,
    path,
    queryKeys: [...url.searchParams.keys()],
  });

  try {
    const res = await run(request);
    logOAuthDebug("better-auth.response", undefined, {
      correlationId,
      method,
      path,
      status: res.status,
      ms: Date.now() - start,
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
