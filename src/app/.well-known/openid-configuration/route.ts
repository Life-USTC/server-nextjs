import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { betterAuthInstance } from "@/auth";
export const dynamic = "force-dynamic";

const baseHandler = oauthProviderOpenIdConfigMetadata(betterAuthInstance);

export async function GET(request: Request) {
  const response = await baseHandler(request);
  const body = await response.json();

  // Derive site origin from the issuer (e.g. "https://…/api/auth" → "https://…")
  const siteOrigin = body.issuer
    ? new URL(body.issuer).origin
    : new URL(request.url).origin;

  // Add device authorization grant (RFC 8628)
  const augmented = {
    ...body,
    device_authorization_endpoint: `${siteOrigin}/api/auth/oauth2/device-authorization`,
    grant_types_supported: [
      ...(body.grant_types_supported ?? []),
      "urn:ietf:params:oauth:grant-type:device_code",
    ],
  };

  return new Response(JSON.stringify(augmented), {
    status: response.status,
    headers: response.headers,
  });
}
