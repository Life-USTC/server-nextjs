import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isTrustedAuthOrigin } from "@/lib/auth/auth-origins";
import { logOAuthDebug } from "@/lib/log/oauth-debug";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MCP_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "MCP-Session-Id, WWW-Authenticate",
} as const;

function appendVaryHeader(headers: Headers, value: string) {
  const existing = headers.get("Vary");
  const parts = new Set(
    (existing ? existing.split(",") : [])
      .map((item) => item.trim())
      .filter(Boolean),
  );
  parts.add(value);
  headers.set("Vary", Array.from(parts).join(", "));
}

function buildMcpCorsHeaders(request: Request, responseHeaders?: HeadersInit) {
  const headers = new Headers(responseHeaders);
  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) {
    headers.set(key, value);
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    headers.set("Access-Control-Allow-Origin", "*");
    return headers;
  }

  headers.set("Access-Control-Allow-Origin", origin);
  appendVaryHeader(headers, "Origin");
  return headers;
}

function withMcpCors(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: buildMcpCorsHeaders(request, headers),
  });
}

function buildInvalidOriginResponse() {
  return new Response(JSON.stringify({ error: "invalid_origin" }), {
    status: 403,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function validateMcpOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }
  return isTrustedAuthOrigin(origin) ? null : buildInvalidOriginResponse();
}

async function handleMcpRequest(request: Request) {
  const start = Date.now();
  logOAuthDebug("mcp.request", request, {
    method: request.method,
    path: new URL(request.url).pathname,
    accept: request.headers.get("accept")?.slice(0, 120) ?? null,
  });

  const originError = validateMcpOrigin(request);
  if (originError) {
    logOAuthDebug("mcp.response", request, {
      status: originError.status,
      ms: Date.now() - start,
      phase: "origin-rejected",
    });
    return originError;
  }

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
    return withMcpCors(request, res);
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
  return withMcpCors(request, res);
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

export function OPTIONS(request: Request) {
  const originError = validateMcpOrigin(request);
  if (originError) {
    return originError;
  }
  return new Response(null, {
    status: 204,
    headers: buildMcpCorsHeaders(request),
  });
}
