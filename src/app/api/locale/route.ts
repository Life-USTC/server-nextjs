import type { NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";
import { handleRouteError, jsonResponse } from "@/lib/api/helpers";
import { localeUpdateRequestSchema } from "@/lib/api/schemas/request-schemas";

export const dynamic = "force-dynamic";

/**
 * Update user locale cookie.
 * @body localeUpdateRequestSchema
 * @response successResponseSchema
 * @response 400:openApiErrorSchema
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = localeUpdateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError("Invalid locale", parsedBody.error, 400);
    }

    const locale = parsedBody.data.locale;

    const response = jsonResponse({ success: true });
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return handleRouteError("Failed to set locale", error);
  }
}
