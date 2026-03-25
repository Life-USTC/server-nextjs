import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { logOAuthDebug } from "@/lib/log/oauth-debug";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleMcpRequest(request: Request) {
  const start = Date.now();
  logOAuthDebug("mcp.request", request, {
    method: request.method,
    path: new URL(request.url).pathname,
    accept: request.headers.get("accept")?.slice(0, 120) ?? null,
  });

  const authResult = await authenticateMcpRequest(request);
  if ("response" in authResult) {
    const res = authResult.response;
    const www = res.headers.get("www-authenticate");
    logOAuthDebug("mcp.response", request, {
      status: res.status,
      ms: Date.now() - start,
      phase: "auth-rejected",
      wwwAuthenticatePrefix: www ? www.slice(0, 200) : null,
    });
    return res;
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer();

  await server.connect(transport);
  const res = await transport.handleRequest(request, {
    authInfo: authResult.authInfo,
  });
  logOAuthDebug("mcp.response", request, {
    status: res.status,
    ms: Date.now() - start,
    phase: "handled",
  });
  return res;
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
