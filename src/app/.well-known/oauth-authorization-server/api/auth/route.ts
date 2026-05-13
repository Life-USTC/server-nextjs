import {
  createDiscoveryMetadataRoute,
  getAuthServerMetadataResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Canonical RFC 8414 authorization server metadata for issuer `/api/auth`.
 * @response 200
 */
export const { GET, OPTIONS } = createDiscoveryMetadataRoute(
  getAuthServerMetadataResponse,
);
