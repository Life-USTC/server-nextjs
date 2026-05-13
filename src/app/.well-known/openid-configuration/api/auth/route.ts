import {
  createDiscoveryMetadataRoute,
  getOpenIdMetadataResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * RFC 8414-compatible path form for OpenID provider metadata.
 * @response 200
 */
export const { GET, OPTIONS } = createDiscoveryMetadataRoute(
  getOpenIdMetadataResponse,
);
