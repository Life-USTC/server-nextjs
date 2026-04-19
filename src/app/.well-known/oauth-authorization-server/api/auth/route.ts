import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { betterAuthInstance } from "@/auth";

export const dynamic = "force-dynamic";

const baseHandler = oauthProviderAuthServerMetadata(betterAuthInstance);

export async function GET(request: Request) {
  const response = await baseHandler(request);
  const body = await response.json();

  const siteOrigin = body.issuer
    ? new URL(body.issuer).origin
    : new URL(request.url).origin;

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
