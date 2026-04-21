import { getPublicOrigin } from "@/lib/site-url";

export function getTrustedAuthOrigin(_request: Request): string {
  return getPublicOrigin();
}

export function buildTrustedAuthUrl(pathname: string, request: Request): URL {
  return new URL(pathname, getTrustedAuthOrigin(request));
}
