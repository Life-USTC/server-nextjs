import { getOAuthProtectedResourceMetadataUrl } from "@/lib/mcp/urls";
import {
  getDiscoveryOptionsResponse,
  getDiscoveryRedirectResponse,
} from "@/lib/oauth/discovery-metadata";

export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that probe the resource-origin root path.
 * The canonical RFC 9728 URL is path-specific for resource `/api/mcp`.
 * @response 307
 */
export function GET() {
  return getDiscoveryRedirectResponse(getOAuthProtectedResourceMetadataUrl());
}

/**
 * CORS preflight for protected resource metadata alias.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
