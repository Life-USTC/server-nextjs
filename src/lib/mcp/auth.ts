import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { prisma } from "@/lib/db/prisma";
import { MCP_TOOLS_SCOPE, resourceIndicatorsMatch } from "@/lib/oauth/utils";
import { getMcpServerUrl, getOAuthProtectedResourceMetadataUrl } from "./urls";

const INVALID_TOKEN_ERROR = "invalid_token";
const INSUFFICIENT_SCOPE_ERROR = "insufficient_scope";

type AuthFailure = {
  error: string;
  status: number;
  description: string;
};

function buildBearerHeader({
  request,
  error,
  description,
  scopes,
}: {
  request: Request;
  error: string;
  description: string;
  scopes?: string[];
}) {
  const parts = [
    `Bearer error="${error}"`,
    `error_description="${description}"`,
    `resource_metadata="${getOAuthProtectedResourceMetadataUrl(request).toString()}"`,
  ];

  if (scopes && scopes.length > 0) {
    parts.push(`scope="${scopes.join(" ")}"`);
  }

  return parts.join(", ");
}

function buildAuthErrorResponse(
  request: Request,
  failure: AuthFailure,
  scopes?: string[],
) {
  return new Response(JSON.stringify({ error: failure.error }), {
    status: failure.status,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": buildBearerHeader({
        request,
        error: failure.error,
        description: failure.description,
        scopes,
      }),
    },
  });
}

function parseBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function verifyAccessToken(
  token: string,
): Promise<AuthInfo | AuthFailure> {
  const accessToken = await prisma.oAuthAccessToken.findUnique({
    where: { token },
    include: {
      client: {
        select: {
          clientId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });

  if (!accessToken) {
    return {
      error: INVALID_TOKEN_ERROR,
      status: 401,
      description: "Access token not found",
    };
  }

  if (accessToken.expiresAt < new Date()) {
    await prisma.oAuthAccessToken.deleteMany({
      where: { id: accessToken.id },
    });

    return {
      error: INVALID_TOKEN_ERROR,
      status: 401,
      description: "Access token has expired",
    };
  }

  return {
    token,
    clientId: accessToken.client.clientId,
    scopes: accessToken.scopes,
    expiresAt: Math.floor(accessToken.expiresAt.getTime() / 1000),
    resource: accessToken.resource ? new URL(accessToken.resource) : undefined,
    extra: {
      userId: accessToken.user.id,
      username: accessToken.user.username,
      name: accessToken.user.name,
    },
  };
}

export async function authenticateMcpRequest(
  request: Request,
): Promise<{ authInfo: AuthInfo } | { response: Response }> {
  const token = parseBearerToken(request);
  if (!token) {
    return {
      response: buildAuthErrorResponse(request, {
        error: INVALID_TOKEN_ERROR,
        status: 401,
        description: "Missing bearer token",
      }),
    };
  }

  const authInfo = await verifyAccessToken(token);
  if ("error" in authInfo) {
    return { response: buildAuthErrorResponse(request, authInfo) };
  }

  if (
    !authInfo.resource ||
    !resourceIndicatorsMatch(authInfo.resource, getMcpServerUrl(request))
  ) {
    return {
      response: buildAuthErrorResponse(request, {
        error: INVALID_TOKEN_ERROR,
        status: 401,
        description: "Access token is not bound to this MCP resource",
      }),
    };
  }

  if (!authInfo.scopes.includes(MCP_TOOLS_SCOPE)) {
    return {
      response: buildAuthErrorResponse(
        request,
        {
          error: INSUFFICIENT_SCOPE_ERROR,
          status: 403,
          description: "Access token does not include the MCP scope",
        },
        [MCP_TOOLS_SCOPE],
      ),
    };
  }

  return { authInfo };
}
