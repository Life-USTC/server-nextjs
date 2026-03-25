function normalizeConfiguredUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
}

function getConfiguredAuthOrigin(): string | null {
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const normalized = normalizeConfiguredUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getTrustedAuthOrigin(request: Request): string {
  const configured = getConfiguredAuthOrigin();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return new URL(request.url).origin;
  }

  throw new Error(
    "Missing BETTER_AUTH_URL/NEXTAUTH_URL/VERCEL_URL for trusted auth origin",
  );
}

export function buildTrustedAuthUrl(pathname: string, request: Request): URL {
  return new URL(pathname, getTrustedAuthOrigin(request));
}
