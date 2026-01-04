import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth";

const locales = ["en-us", "zh-cn"];
const defaultLocale = "zh-cn";
const LOCALE_COOKIE = "NEXT_LOCALE";

// Define protected routes that require authentication
const protectedRoutes = ["/me", "/api/me"];

function getLocale(request: NextRequest): string {
  // 1. Check cookie first
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "zh-CN,zh;q=0.9,en;q=0.8")
    const languages = acceptLanguage
      .split(",")
      .map((lang) => {
        const [locale, q] = lang.trim().split(";q=");
        return {
          locale: locale.toLowerCase(),
          quality: q ? Number.parseFloat(q) : 1.0,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { locale } of languages) {
      // Try exact match first
      if (locales.includes(locale)) {
        return locale;
      }
      // Try language prefix match (e.g., "zh" matches "zh-cn")
      const prefix = locale.split("-")[0];
      const matched = locales.find((l) => l.startsWith(prefix));
      if (matched) {
        return matched;
      }
    }
  }

  // 3. Fallback to default locale
  return defaultLocale;
}

export default async function proxy(request: NextRequest) {
  const locale = getLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    // Check authentication for protected routes
    const user = await getSession();

    if (!user) {
      // Redirect to login page
      const loginUrl = new URL("/api/auth/signin", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set locale cookie if not already set or different
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
