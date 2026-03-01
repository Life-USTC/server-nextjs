const SAFE_PROTOCOLS = new Set(["http", "https"]);

function parseForwardedHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function getRequestProtocol(request: Request): string {
  const forwardedProtocol = parseForwardedHeaderValue(
    request.headers.get("x-forwarded-proto"),
  )?.toLowerCase();

  if (forwardedProtocol && SAFE_PROTOCOLS.has(forwardedProtocol)) {
    return forwardedProtocol;
  }

  return new URL(request.url).protocol.replace(":", "");
}

function getRequestHost(request: Request): string | null {
  const forwardedHost = parseForwardedHeaderValue(
    request.headers.get("x-forwarded-host"),
  );

  if (forwardedHost) {
    return forwardedHost;
  }

  return parseForwardedHeaderValue(request.headers.get("host"));
}

export function resolveRequestRelativeUrl(
  pathname: string,
  request: Request,
): URL {
  const host = getRequestHost(request);

  if (!host) {
    return new URL(pathname, request.url);
  }

  const protocol = getRequestProtocol(request);
  return new URL(pathname, `${protocol}://${host}`);
}
