import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { USTC_DASHBOARD_LINKS } from "@/lib/dashboard-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  const target = USTC_DASHBOARD_LINKS.find((link) => link.slug === slug);

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    await prisma.dashboardLinkClick.upsert({
      where: {
        userId_slug: {
          userId,
          slug: target.slug,
        },
      },
      create: {
        userId,
        slug: target.slug,
        count: 1,
        lastClickedAt: new Date(),
      },
      update: {
        count: { increment: 1 },
        lastClickedAt: new Date(),
      },
    });
  }

  return NextResponse.redirect(target.url);
}
