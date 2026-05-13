import { getOAuthOpenIdConfigurationUrl } from "@/lib/mcp/urls";
import { createDiscoveryRedirectRoute } from "@/lib/oauth/discovery-metadata";
export const dynamic = "force-dynamic";

/**
 * Compatibility alias for clients that look up root OpenID discovery directly.
 * The canonical OIDC discovery URL remains `{issuer}/.well-known/openid-configuration`.
 * @response 307
 */
export const { GET, OPTIONS } = createDiscoveryRedirectRoute(() =>
  getOAuthOpenIdConfigurationUrl(),
);
