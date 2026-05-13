import { getOAuthAuthorizationServerMetadataUrl } from "@/lib/mcp/urls";
import { createDiscoveryRedirectRoute } from "@/lib/oauth/discovery-metadata";
export const dynamic = "force-dynamic";

/**
 * Compatibility alias for legacy clients that probe the root well-known path.
 * The canonical metadata URL for issuer `/api/auth` is path-specific.
 * @response 307
 */
export const { GET, OPTIONS } = createDiscoveryRedirectRoute(() =>
  getOAuthAuthorizationServerMetadataUrl(),
);
