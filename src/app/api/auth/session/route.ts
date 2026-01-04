import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token required" },
        { status: 400 },
      );
    }

    // Verify session token
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 401 },
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate session" },
      { status: 500 },
    );
  }
}
