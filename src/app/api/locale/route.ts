import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { localeUpdateRequestSchema } from "@/lib/api-schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = localeUpdateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return handleRouteError("Invalid locale", parsedBody.error, 400);
    }

    const locale = parsedBody.data.locale;

    const response = NextResponse.json({ success: true });
    response.cookies.set("NEXT_LOCALE", locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return handleRouteError("Failed to set locale", error);
  }
}
