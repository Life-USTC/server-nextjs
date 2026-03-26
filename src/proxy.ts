import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCALE_COOKIE, negotiateLocale } from "@/i18n/config";

export default async function proxy(request: NextRequest) {
  const session = await auth(request.headers);
  if (!request.nextUrl) {
    return NextResponse.next();
  }

  // Redirect signed-in users with incomplete profiles to /welcome
  const pathname = request.nextUrl.pathname;
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

  // Set locale in request header for next-intl
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
  // Match all pathnames except for
  // - API routes
  // - _next (Next.js internals)
  // - Static files
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
