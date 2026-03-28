import { auth } from "@/auth";
import { jsonResponse } from "@/lib/api/helpers";

/**
 * Compatibility endpoint for existing tests/tools that still call
 * `/api/auth/session` from NextAuth days.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return jsonResponse({ user: null });
  }

  return jsonResponse({
    user: session.user,
    expires: session.session.expiresAt.toISOString(),
  });
}
