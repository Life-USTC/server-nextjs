import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Simple redirect to CAS system for authentication
    // The CAS system will call our callback URL with user information
    const casUrl = `https://sso-proxy.lug.ustc.edu.cn/auth/default?service=${encodeURIComponent(env.CAS_CALLBACK_URL)}`;

    return NextResponse.redirect(casUrl);
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Failed to initiate sign-in" },
      { status: 500 },
    );
  }
}
