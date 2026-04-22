import {
  getDiscoveryOptionsResponse,
  getOpenIdMetadataResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * RFC 8414-compatible path form for OpenID provider metadata.
 * @response 200
 */
export async function GET(request: Request) {
  return getOpenIdMetadataResponse(request);
}

/**
 * CORS preflight for OpenID provider metadata.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
