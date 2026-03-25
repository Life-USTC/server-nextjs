import { NextResponse } from "next/server";
import {
  getOAuthIssuerUrl,
  OAUTH_AUTHORIZATION_PATH,
  OAUTH_REGISTRATION_PATH,
  OAUTH_TOKEN_PATH,
} from "@/lib/mcp/urls";
import { MCP_TOOLS_SCOPE } from "@/lib/oauth/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const issuerUrl = getOAuthIssuerUrl(request);

  return NextResponse.json({
    issuer: issuerUrl.toString(),
    authorization_endpoint: new URL(
      OAUTH_AUTHORIZATION_PATH,
      issuerUrl,
    ).toString(),
    token_endpoint: new URL(OAUTH_TOKEN_PATH, issuerUrl).toString(),
    registration_endpoint: new URL(
      OAUTH_REGISTRATION_PATH,
      issuerUrl,
    ).toString(),
    userinfo_endpoint: new URL("/api/oauth/userinfo", issuerUrl).toString(),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    client_id_metadata_document_supported: false,
    scopes_supported: ["openid", "profile", MCP_TOOLS_SCOPE],
    subject_types_supported: ["public"],
    claims_supported: ["sub", "name", "preferred_username", "picture"],
  });
}
