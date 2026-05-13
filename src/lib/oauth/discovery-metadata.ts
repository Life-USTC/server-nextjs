import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { NextResponse } from "next/server";
import { betterAuthInstance } from "@/auth";
import { asOAuthProviderMetadataAuth } from "@/lib/oauth/provider-api";

const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
const DISCOVERY_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

type DiscoveryMetadata = {
  issuer?: string;
  grant_types_supported?: string[];
  [key: string]: unknown;
};

const oauthProviderMetadataAuth =
  asOAuthProviderMetadataAuth(betterAuthInstance);
const authServerMetadataHandler = oauthProviderAuthServerMetadata(
  oauthProviderMetadataAuth,
);
const openIdConfigMetadataHandler = oauthProviderOpenIdConfigMetadata(
  oauthProviderMetadataAuth,
);

function withDiscoveryCorsHeaders(headers?: HeadersInit): Headers {
  const responseHeaders = new Headers(headers);
  for (const [key, value] of Object.entries(DISCOVERY_CORS_HEADERS)) {
    responseHeaders.set(key, value);
  }
  return responseHeaders;
}

function augmentDiscoveryMetadata(
  request: Request,
  body: DiscoveryMetadata,
): DiscoveryMetadata {
  const siteOrigin = body.issuer
    ? new URL(body.issuer).origin
    : new URL(request.url).origin;

  return {
    ...body,
    device_authorization_endpoint: `${siteOrigin}/api/auth/oauth2/device-authorization`,
    grant_types_supported: [
      ...new Set([
        ...(body.grant_types_supported ?? []),
        DEVICE_CODE_GRANT_TYPE,
      ]),
    ],
  };
}

async function buildDiscoveryMetadataResponse(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  const response = await handler(request);
  const body = (await response.json()) as DiscoveryMetadata;

  return new Response(JSON.stringify(augmentDiscoveryMetadata(request, body)), {
    status: response.status,
    headers: withDiscoveryCorsHeaders(response.headers),
  });
}

export async function getAuthServerMetadataResponse(request: Request) {
  return buildDiscoveryMetadataResponse(request, authServerMetadataHandler);
}

export async function getOpenIdMetadataResponse(request: Request) {
  return buildDiscoveryMetadataResponse(request, openIdConfigMetadataHandler);
}

export function getDiscoveryOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: withDiscoveryCorsHeaders(),
  });
}

export function getDiscoveryRedirectResponse(url: URL | string, status = 307) {
  const response = NextResponse.redirect(url, status);
  const headers = withDiscoveryCorsHeaders(response.headers);
  response.headers.forEach((_, key) => {
    response.headers.delete(key);
  });
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

type DiscoveryRouteHandlers = {
  GET: (request: Request) => Promise<Response> | Response;
  OPTIONS: typeof getDiscoveryOptionsResponse;
};

export function createDiscoveryMetadataRoute(
  getResponse: (request: Request) => Promise<Response> | Response,
): DiscoveryRouteHandlers {
  return {
    GET: getResponse,
    OPTIONS: getDiscoveryOptionsResponse,
  };
}

export function createDiscoveryRedirectRoute(
  resolveUrl: (request: Request) => URL | string,
  status = 307,
): DiscoveryRouteHandlers {
  return createDiscoveryMetadataRoute((request) =>
    getDiscoveryRedirectResponse(resolveUrl(request), status),
  );
}
