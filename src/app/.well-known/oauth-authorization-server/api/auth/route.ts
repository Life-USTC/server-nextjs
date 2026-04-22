import {
  getAuthServerMetadataResponse,
  getDiscoveryOptionsResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Canonical RFC 8414 authorization server metadata for issuer `/api/auth`.
 * @response 200
 */
export async function GET(request: Request) {
  return getAuthServerMetadataResponse(request);
}

/**
 * CORS preflight for authorization server metadata.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
