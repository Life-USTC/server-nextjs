import { NextResponse } from "next/server";
import { USTC_DASHBOARD_LINKS } from "@/features/dashboard-links/lib/dashboard-links";
import { dashboardLinkPinRequestSchema } from "@/lib/api/schemas/request-schemas";
import { resolveApiUserId } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import { logAppEvent } from "@/lib/log/app-logger";

export const dynamic = "force-dynamic";

const MAX_PINNED_LINKS = 5;

type PinApiResponse = {
  pinnedSlugs: string[];
  maxPinnedLinks: number;
};

function sanitizeReturnTo(value: string | undefined): string {
  if (!value?.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (/[\\\r\n]/.test(value)) return "/";
  return value;
}

/**
 * Pin or unpin one dashboard link for the current user.
 * @body dashboardLinkPinRequestSchema
 * @response 303
 */
export async function POST(request: Request) {
  const wantsJson =
    request.headers.get("accept")?.includes("application/json") ?? false;
  const formData = await request.formData();
  const parsedBody = dashboardLinkPinRequestSchema.safeParse({
    slug: formData.get("slug"),
    returnTo: formData.get("returnTo"),
    action: formData.get("action"),
  });

  if (!parsedBody.success) {
    if (wantsJson) {
      return NextResponse.json<PinApiResponse>(
        { pinnedSlugs: [], maxPinnedLinks: MAX_PINNED_LINKS },
        { status: 400 },
      );
    }
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const { slug } = parsedBody.data;
  const returnTo = sanitizeReturnTo(parsedBody.data.returnTo);
  const action = parsedBody.data.action === "unpin" ? "unpin" : "pin";
  const link = USTC_DASHBOARD_LINKS.find((item) => item.slug === slug);

  if (!link) {
    if (wantsJson) {
      return NextResponse.json<PinApiResponse>({
        pinnedSlugs: [],
        maxPinnedLinks: MAX_PINNED_LINKS,
      });
    }
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const userId = await resolveApiUserId(request);

  if (!userId) {
    if (wantsJson) {
      return NextResponse.json<PinApiResponse>(
        { pinnedSlugs: [], maxPinnedLinks: MAX_PINNED_LINKS },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  let pinnedSlugs: string[] = [];

  try {
    if (action === "pin") {
      pinnedSlugs = await prisma.$transaction(async (tx) => {
        await tx.dashboardLinkPin.upsert({
          where: { userId_slug: { userId, slug } },
          create: { userId, slug },
          update: {},
        });

        const pinnedRows = await tx.dashboardLinkPin.findMany({
          where: { userId },
          select: { slug: true },
          orderBy: { createdAt: "asc" },
        });
        const overflowRows = pinnedRows.slice(0, -MAX_PINNED_LINKS);

        if (overflowRows.length > 0) {
          await tx.dashboardLinkPin.deleteMany({
            where: {
              userId,
              slug: { in: overflowRows.map((row) => row.slug) },
            },
          });
        }

        const finalRows = await tx.dashboardLinkPin.findMany({
          where: { userId },
          select: { slug: true },
        });
        return finalRows.map((row) => row.slug);
      });
    } else {
      await prisma.dashboardLinkPin.deleteMany({
        where: { userId, slug },
      });

      const finalRows = await prisma.dashboardLinkPin.findMany({
        where: { userId },
        select: { slug: true },
      });
      pinnedSlugs = finalRows.map((row) => row.slug);
    }
  } catch (error) {
    logAppEvent(
      "error",
      "Failed to update dashboard link pin state",
      {
        source: "route-handler",
        userId,
        slug,
        action,
      },
      error,
    );

    try {
      const fallbackRows = await prisma.dashboardLinkPin.findMany({
        where: { userId },
        select: { slug: true },
      });
      pinnedSlugs = fallbackRows.map((row) => row.slug);
    } catch (fallbackError) {
      logAppEvent(
        "error",
        "Fallback dashboard link pin query failed",
        {
          source: "route-handler",
          userId,
          slug,
        },
        fallbackError,
      );
      pinnedSlugs = [];
    }
  }

  if (wantsJson) {
    return NextResponse.json<PinApiResponse>({
      pinnedSlugs,
      maxPinnedLinks: MAX_PINNED_LINKS,
    });
  }

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
