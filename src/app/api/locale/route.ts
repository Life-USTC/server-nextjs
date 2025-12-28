import { type NextRequest, NextResponse } from "next/server";

const locales = ["en-us", "zh-cn"];

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !locales.includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("NEXT_LOCALE", locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to set locale" },
      { status: 500 },
    );
  }
}
