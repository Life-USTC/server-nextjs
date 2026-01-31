import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";

const locales = ["en-us", "zh-cn"];

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !locales.includes(locale)) {
      return handleRouteError(
        "Invalid locale",
        new Error("Invalid locale"),
        400,
      );
    }

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
