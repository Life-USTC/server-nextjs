import { getOAuthAuthorizationServerMetadataUrl } from "@/lib/mcp/urls";
import { createDiscoveryRedirectRoute } from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that probe resource-path authorization-server metadata.
 * @response 307
 */
export const { GET, OPTIONS } = createDiscoveryRedirectRoute((request) =>
  getOAuthAuthorizationServerMetadataUrl(request),
);
