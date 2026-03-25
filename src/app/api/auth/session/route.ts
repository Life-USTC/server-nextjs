import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Compatibility endpoint for existing tests/tools that still call
 * `/api/auth/session` from NextAuth days.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: session.user,
    expires: session.session.expiresAt.toISOString(),
  });
}
