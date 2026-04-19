export const dynamic = "force-dynamic";

import { randomBytes } from "node:crypto";
import { jsonResponse } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";
import { logOAuthDebug } from "@/lib/log/oauth-debug";

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: { secret?: string; email?: string; userId?: string };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
    }

    const { secret, email, userId } = body;

    // Validate webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret || secret !== webhookSecret) {
      logOAuthDebug("webhook-login.auth-failed", request, {
        reason: "invalid_or_missing_secret",
      });
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }

    // Validate that at least email or userId is provided
    if (!email && !userId) {
      logOAuthDebug("webhook-login.missing-params", request, {
        reason: "neither_email_nor_userId_provided",
      });
      return jsonResponse(
        { error: "Either email or userId is required" },
        { status: 400 },
      );
    }

    // Look up user by email or userId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(userId ? [{ id: userId }] : []),
        ],
      },
    });

    if (!user) {
      logOAuthDebug("webhook-login.user-not-found", request, {
        hasEmail: Boolean(email),
        hasUserId: Boolean(userId),
      });
      return jsonResponse({ error: "User not found" }, { status: 404 });
    }

    // Create session token
    const sessionToken = randomBytes(32).toString("base64url");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session in database
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
        ipAddress: request.headers.get("x-forwarded-for") || "webhook",
        userAgent: request.headers.get("user-agent") || "webhook-login",
      },
    });

    logOAuthDebug("webhook-login.success", request, {
      userId: user.id,
    });

    // Create response with session info
    const response = jsonResponse({
      ok: true,
      userId: user.id,
      email: user.email,
      sessionToken,
      expires: expires.toISOString(),
    });

    // Set session cookie
    const isSecure = (process.env.BETTER_AUTH_URL || "").startsWith("https");
    response.headers.set(
      "Set-Cookie",
      `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}; Expires=${expires.toUTCString()}`,
    );

    return response;
  } catch (error) {
    logOAuthDebug("webhook-login.error", request, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Internal server error" }, { status: 500 });
  }
}
