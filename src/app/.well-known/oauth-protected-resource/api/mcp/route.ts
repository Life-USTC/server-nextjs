import { NextResponse } from "next/server";
import { getMcpServerUrl, getOAuthIssuerUrl } from "@/lib/mcp/urls";
import { getDiscoveryOptionsResponse } from "@/lib/oauth/discovery-metadata";
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";

export const dynamic = "force-dynamic";

/**
 * Canonical RFC 9728 protected resource metadata for MCP.
 * @response 200
 */
export async function GET(request: Request) {
  const issuerUrl = getOAuthIssuerUrl(request);

  return NextResponse.json(
    {
      resource: getMcpServerUrl(request).toString(),
      authorization_servers: [issuerUrl.toString()],
      scopes_supported: [MCP_TOOLS_SCOPE],
      bearer_methods_supported: ["header"],
      resource_documentation: new URL("/api-docs", issuerUrl).toString(),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}

/**
 * CORS preflight for protected resource metadata.
 * @response 204
 */
export function OPTIONS() {
  return getDiscoveryOptionsResponse();
}
