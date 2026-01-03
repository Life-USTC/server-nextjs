import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { handleCASCallback } from "@/lib/auth";
import { parseCASResponse } from "@/lib/cas-parser";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticket = url.searchParams.get("ticket");
    const callbackUrl = url.searchParams.get("callbackUrl");

    // Basic validation
    if (!ticket) {
      return NextResponse.json(
        { error: "CAS ticket not found" },
        { status: 400 },
      );
    }

    // Validate ticket with CAS server to get user information
    const casCallbackUrl = process.env.CAS_CALLBACK_URL;
    if (!casCallbackUrl) {
      return NextResponse.json(
        { error: "CAS callback URL not configured" },
        { status: 500 },
      );
    }

    const casResponse = await validateCASTicket(ticket, casCallbackUrl);
    if (!casResponse.success) {
      return NextResponse.json(
        { error: "CAS validation failed" },
        { status: 401 },
      );
    }

    if (!casResponse.user) {
      return NextResponse.json(
        { error: "CAS user not found in response" },
        { status: 401 },
      );
    }

    // Handle CAS callback with parsed user data
    const { sessionToken } = await handleCASCallback({
      studentId: casResponse.user,
      gid: casResponse.attributes?.gid,
      email: casResponse.attributes?.email,
      name: casResponse.user,
      avatar: undefined,
    });

    // Set session cookie
    const cookiesStore = await cookies();
    cookiesStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Redirect to original callback URL or home page
    const redirectUrl = callbackUrl
      ? new URL(callbackUrl)
      : new URL("/", request.url);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("CAS callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/api/auth/error?error=${encodeURIComponent("Authentication failed")}`,
        request.url,
      ),
    );
  }
}

async function validateCASTicket(
  ticket: string,
  service: string,
): Promise<{
  success: boolean;
  user?: string;
  attributes?: { [key: string]: string };
}> {
  try {
    const validationUrl = `https://sso-proxy.lug.ustc.edu.cn/auth/default/validate/?ticket=${encodeURIComponent(ticket)}&service=${encodeURIComponent(service)}`;

    const response = await fetch(validationUrl);
    const xmlText = await response.text();
    const parsedResponse = parseCASResponse(xmlText);

    return parsedResponse;
  } catch (_error) {
    return { success: false };
  }
}
