import { randomBytes } from "node:crypto";
import { handlers } from "@/auth";
import { jsonResponse } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { logOAuthDebug, withBetterAuthOAuthDebug } from "@/lib/log/oauth-debug";
import {
  DEVICE_CODE_ERRORS,
  DEVICE_CODE_POLL_INTERVAL,
  DEVICE_CODE_STATUS,
} from "@/lib/oauth/device-code";
import { hashOAuthClientSecretForDbStorage } from "@/lib/oauth/utils";

export const dynamic = "force-dynamic";

const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

function deviceCodeError(error: string, status = 400) {
  return jsonResponse({ error }, { status });
}

async function handleDeviceCodeGrant(
  request: Request,
  params: URLSearchParams,
) {
  const deviceCode = params.get("device_code");
  const clientId = params.get("client_id");

  if (!deviceCode || !clientId) {
    return deviceCodeError("invalid_request");
  }

  // Find the device code record
  const record = await prisma.deviceCode.findUnique({
    where: { deviceCode },
    select: {
      id: true,
      expiresAt: true,
      lastPolledAt: true,
      status: true,
      userId: true,
      scopes: true,
      client: { select: { clientId: true, disabled: true } },
    },
  });

  if (!record || record.client.clientId !== clientId) {
    return deviceCodeError("invalid_grant");
  }

  if (record.client.disabled) {
    return deviceCodeError("invalid_client");
  }

  // Check expiry
  if (record.expiresAt < new Date()) {
    return deviceCodeError(DEVICE_CODE_ERRORS.EXPIRED_TOKEN);
  }

  // Check polling rate (slow_down)
  if (record.lastPolledAt) {
    const elapsed = Date.now() - record.lastPolledAt.getTime();
    if (elapsed < DEVICE_CODE_POLL_INTERVAL * 1000) {
      // Update lastPolledAt even on slow_down
      await prisma.deviceCode.update({
        where: { id: record.id },
        data: { lastPolledAt: new Date() },
      });
      return deviceCodeError(DEVICE_CODE_ERRORS.SLOW_DOWN);
    }
  }

  // Update lastPolledAt
  await prisma.deviceCode.update({
    where: { id: record.id },
    data: { lastPolledAt: new Date() },
  });

  // Check status
  if (record.status === DEVICE_CODE_STATUS.DENIED) {
    return deviceCodeError(DEVICE_CODE_ERRORS.ACCESS_DENIED);
  }

  if (record.status === DEVICE_CODE_STATUS.PENDING) {
    return deviceCodeError(DEVICE_CODE_ERRORS.AUTHORIZATION_PENDING);
  }

  // Status is APPROVED - issue tokens
  if (!record.userId) {
    return deviceCodeError("server_error", 500);
  }

  // Generate opaque access token and refresh token
  const accessTokenPlain = randomBytes(32).toString("base64url");
  const refreshTokenPlain = randomBytes(32).toString("base64url");
  const accessTokenHash = hashOAuthClientSecretForDbStorage(accessTokenPlain);
  const refreshTokenHash = hashOAuthClientSecretForDbStorage(refreshTokenPlain);

  const accessExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

  // Create refresh token first (access token references it)
  const refreshRecord = await prisma.oAuthRefreshToken.create({
    data: {
      token: refreshTokenHash,
      clientId: record.client.clientId,
      userId: record.userId,
      scopes: record.scopes,
      expiresAt: refreshExpiresAt,
      authTime: new Date(),
    },
  });

  await prisma.oAuthAccessToken.create({
    data: {
      token: accessTokenHash,
      clientId: record.client.clientId,
      userId: record.userId,
      scopes: record.scopes,
      expiresAt: accessExpiresAt,
      refreshId: refreshRecord.id,
    },
  });

  // Delete the used device code
  await prisma.deviceCode.delete({ where: { id: record.id } });

  logOAuthDebug("device-token.success", request, {
    clientIdPrefix: clientId.slice(0, 8),
    userId: record.userId,
    scopeCount: record.scopes.length,
  });

  return jsonResponse({
    access_token: accessTokenPlain,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshTokenPlain,
    scope: record.scopes.join(" "),
  });
}

export async function POST(request: Request) {
  // Clone request to read body without consuming it
  const cloned = request.clone();

  let params: URLSearchParams;
  try {
    const body = await cloned.text();
    params = new URLSearchParams(body);
  } catch {
    // If body parsing fails, delegate to Better Auth
    return withBetterAuthOAuthDebug("POST", request, handlers.POST);
  }

  if (params.get("grant_type") === DEVICE_CODE_GRANT_TYPE) {
    return handleDeviceCodeGrant(request, params);
  }

  // Delegate all other grant types to Better Auth
  return withBetterAuthOAuthDebug("POST", request, handlers.POST);
}

// GET is not used for token endpoint but delegate just in case
export function GET(request: Request) {
  return withBetterAuthOAuthDebug("GET", request, handlers.GET);
}
