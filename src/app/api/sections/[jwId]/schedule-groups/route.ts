import { type NextRequest, NextResponse } from "next/server";
import {
  handleRouteError,
  invalidParamResponse,
  parseInteger,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jwId: string }> },
) {
  try {
    const { jwId } = await context.params;
    const parsedJwId = parseInteger(jwId);

    if (parsedJwId === null) {
      return invalidParamResponse("section ID");
    }

    const section = await prisma.section.findUnique({
      where: { jwId: parsedJwId },
      include: {
        scheduleGroups: {
          select: { schedules: true },
          orderBy: [{ isDefault: "desc" }, { no: "asc" }],
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section.scheduleGroups);
  } catch (error) {
    return handleRouteError("Failed to fetch schedule groups", error);
  }
}
