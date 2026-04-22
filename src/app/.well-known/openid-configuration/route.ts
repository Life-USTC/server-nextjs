import { getOAuthOpenIdConfigurationUrl } from "@/lib/mcp/urls";
import {
  getDiscoveryOptionsResponse,
  getDiscoveryRedirectResponse,
} from "@/lib/oauth/discovery-metadata";
export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that look up root OpenID discovery directly.
 * The canonical OIDC discovery URL remains `{issuer}/.well-known/openid-configuration`.
 * @response 307
 */
export function GET() {
  return getDiscoveryRedirectResponse(getOAuthOpenIdConfigurationUrl());
}

/**
 * CORS preflight for OpenID discovery alias.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
