const IPV4_LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);
const IPV6_LOOPBACK_HOSTS = new Set(["[::1]", "::1"]);

function getLoopbackHostFamily(hostname: string): "ipv4" | "ipv6" | null {
  if (IPV4_LOOPBACK_HOSTS.has(hostname)) {
    return "ipv4";
  }
  if (IPV6_LOOPBACK_HOSTS.has(hostname)) {
    return "ipv6";
  }
  return null;
}

/**
 * Better Auth compares redirect URIs as exact strings. For public native
 * clients using loopback redirects, allow localhost/127.0.0.1 aliasing while
 * keeping scheme, port, path, query, and fragment strict.
 */
export function resolveEquivalentLoopbackRedirectUri(
  registeredRedirectUris: string[],
  requestedRedirectUri: string,
): string | null {
  let requestedUrl: URL;
  try {
    requestedUrl = new URL(requestedRedirectUri);
  } catch {
    return null;
  }

  const requestedFamily = getLoopbackHostFamily(requestedUrl.hostname);
  if (!requestedFamily) {
    return null;
  }

  for (const registeredRedirectUri of registeredRedirectUris) {
    let registeredUrl: URL;
    try {
      registeredUrl = new URL(registeredRedirectUri);
    } catch {
      continue;
    }

    if (getLoopbackHostFamily(registeredUrl.hostname) !== requestedFamily) {
      continue;
    }
    if (registeredUrl.protocol !== requestedUrl.protocol) {
      continue;
    }
    if (registeredUrl.port !== requestedUrl.port) {
      continue;
    }
    if (registeredUrl.pathname !== requestedUrl.pathname) {
      continue;
    }
    if (registeredUrl.search !== requestedUrl.search) {
      continue;
    }
    if (registeredUrl.hash !== requestedUrl.hash) {
      continue;
    }

    return registeredRedirectUri;
  }

  return null;
}
