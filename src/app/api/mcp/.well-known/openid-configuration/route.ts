import { getOAuthOpenIdConfigurationUrl } from "@/lib/mcp/urls";
import {
  getDiscoveryOptionsResponse,
  getDiscoveryRedirectResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that probe OIDC metadata relative to /api/mcp.
 * @response 307
 */
export function GET(request: Request) {
  return getDiscoveryRedirectResponse(getOAuthOpenIdConfigurationUrl(request));
}

export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
