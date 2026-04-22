import { getOAuthAuthorizationServerMetadataUrl } from "@/lib/mcp/urls";
import {
  getDiscoveryOptionsResponse,
  getDiscoveryRedirectResponse,
} from "@/lib/oauth/discovery-metadata";
export const dynamic = "force-dynamic";

/**
 * Compatibility alias for legacy clients that probe the root well-known path.
 * The canonical metadata URL for issuer `/api/auth` is path-specific.
 * @response 307
 */
export function GET() {
  return getDiscoveryRedirectResponse(getOAuthAuthorizationServerMetadataUrl());
}

/**
 * CORS preflight for discovery metadata alias.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
