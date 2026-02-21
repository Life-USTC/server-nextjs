import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-helpers";
import { findCurrentSemester } from "@/lib/current-semester";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const currentSemester = await findCurrentSemester(prisma.semester, now);

    if (!currentSemester) {
      return NextResponse.json(
        { error: "No current semester found" },
        { status: 404 },
      );
    }

    return NextResponse.json(currentSemester);
  } catch (error) {
    return handleRouteError("Failed to fetch current semester", error);
  }
}
