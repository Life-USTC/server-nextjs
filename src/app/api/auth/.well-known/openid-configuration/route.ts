import {
  createDiscoveryMetadataRoute,
  getOpenIdMetadataResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Canonical OpenID Connect Discovery metadata for issuer `/api/auth`.
 * @response 200
 */
export const { GET, OPTIONS } = createDiscoveryMetadataRoute(
  getOpenIdMetadataResponse,
);
