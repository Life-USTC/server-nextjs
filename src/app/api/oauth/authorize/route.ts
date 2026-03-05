import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, handleRouteError, unauthorized } from "@/lib/api/helpers";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Handle the user's approve/deny decision for an OAuth authorization request.
 * Issues an authorization code and redirects to the client's redirect_uri.
 * @response 200:{ redirectTo: string }
 * @response 400:openApiErrorSchema
 * @response 401:openApiErrorSchema
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const {
      clientId,
      redirectUri,
      scopes,
      state,
      codeChallenge,
      codeChallengeMethod,
      approved,
    } = body as {
      clientId: string;
      redirectUri: string;
      scopes: string[];
      state?: string;
      codeChallenge?: string;
      codeChallengeMethod?: string;
      approved: boolean;
    };

    if (!clientId || !redirectUri) {
      return badRequest("Missing required parameters");
    }

    if (!approved) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("error", "access_denied");
      if (state) redirectUrl.searchParams.set("state", state);
      return NextResponse.json({ redirectTo: redirectUrl.toString() });
    }

    // Verify client and redirect_uri
    const oauthClient = await prisma.oAuthClient.findUnique({
      where: { clientId },
      select: { id: true, redirectUris: true, scopes: true, isActive: true },
    });

    if (!oauthClient || !oauthClient.isActive) {
      return badRequest("Unknown client");
    }

    if (!oauthClient.redirectUris.includes(redirectUri)) {
      return badRequest("Invalid redirect URI");
    }

    // Filter to only allowed scopes
    const allowedScopes = (scopes ?? ["profile"]).filter((s: string) =>
      oauthClient.scopes.includes(s),
    );

    // Generate authorization code
    const code = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.oAuthAuthorizationCode.create({
      data: {
        code,
        expiresAt,
        redirectUri,
        scopes: allowedScopes,
        codeChallenge: codeChallenge ?? null,
        codeChallengeMethod: codeChallengeMethod ?? null,
        oauthClientId: oauthClient.id,
        userId: session.user.id,
      },
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    return NextResponse.json({ redirectTo: redirectUrl.toString() });
  } catch (error) {
    return handleRouteError("Failed to process authorization", error);
  }
}
