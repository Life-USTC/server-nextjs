import { getOAuthOpenIdConfigurationUrl } from "@/lib/mcp/urls";
import { createDiscoveryRedirectRoute } from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that probe resource-path OIDC metadata.
 * @response 307
 */
export const { GET, OPTIONS } = createDiscoveryRedirectRoute((request) =>
  getOAuthOpenIdConfigurationUrl(request),
);
