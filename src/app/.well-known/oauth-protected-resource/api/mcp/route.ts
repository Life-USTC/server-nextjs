import { NextResponse } from "next/server";
import { getMcpServerUrl, getOAuthIssuerUrl } from "@/lib/mcp/urls";
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({
    resource: getMcpServerUrl(request).toString(),
    authorization_servers: [getOAuthIssuerUrl(request).toString()],
    scopes_supported: [MCP_TOOLS_SCOPE],
    bearer_methods_supported: ["header"],
    resource_documentation: new URL("/api-docs", request.url).toString(),
  });
}
