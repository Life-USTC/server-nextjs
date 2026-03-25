import { NextResponse } from "next/server";
import { getBetterAuthBaseUrl } from "@/lib/mcp/urls";

export const dynamic = "force-dynamic";

/**
 * Some clients resolve OpenID discovery as `{issuer}/.well-known/openid-configuration`.
 * With issuer `https://host/api/auth` that becomes this path, which Better Auth does not
 * register. Redirect to the root metadata route.
 */
export function GET() {
  const siteOrigin = new URL(`${getBetterAuthBaseUrl()}/`).origin;
  return NextResponse.redirect(
    new URL("/.well-known/openid-configuration", `${siteOrigin}/`),
    307,
  );
}
