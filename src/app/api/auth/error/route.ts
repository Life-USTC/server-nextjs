import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const error = url.searchParams.get("error") || "Unknown error";

    // Return error page or redirect to home with error message
    return NextResponse.json(
      {
        error: "Authentication error",
        message: error,
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Auth error handler error:", error);
    return NextResponse.json(
      { error: "Failed to handle authentication error" },
      { status: 500 },
    );
  }
}
