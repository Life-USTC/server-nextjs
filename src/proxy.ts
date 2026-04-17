import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCALE_COOKIE, negotiateLocale } from "@/i18n/config";
import { logApiRequest, shouldLog } from "@/lib/log/app-logger";
import {
  buildContentSecurityPolicy,
  createScriptNonce,
} from "@/lib/security/csp";

export default async function proxy(request: NextRequest) {
  if (!request.nextUrl) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    const requestId =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);

    if (shouldLog("debug")) {
      logApiRequest(request.method, pathname, 0, 0, {
        requestId,
        event: "request.start",
      });
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const session = await auth(request.headers);

  // Redirect signed-in users with incomplete profiles to /welcome
  const user = session?.user;
  if (
    user &&
    (!user.name || !user.username) &&
    pathname !== "/welcome" &&
    pathname !== "/signin" &&
    !pathname.startsWith("/oauth/")
  ) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  const locale = negotiateLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  const nonce = createScriptNonce();

  // Set locale in request header for next-intl
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce, {
      isDevelopment: process.env.NODE_ENV !== "production",
    }),
  );

  // Set cookie if not already set or different
  const currentCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (currentCookie !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  // Match API routes explicitly so dotted endpoints such as .ics and
  // /.well-known/* still receive request ID propagation and logging.
  matcher: ["/api/:path*", "/((?!_next|.*\\..*).*)"],
};
