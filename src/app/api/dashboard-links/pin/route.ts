import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { USTC_DASHBOARD_LINKS } from "@/lib/dashboard-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const slugValue = formData.get("slug");
  const returnToValue = formData.get("returnTo");
  const actionValue = formData.get("action");

  const slug = typeof slugValue === "string" ? slugValue.trim() : "";
  const returnTo =
    typeof returnToValue === "string" && returnToValue.startsWith("/")
      ? returnToValue
      : "/";
  const action = actionValue === "unpin" ? "unpin" : "pin";
  const link = USTC_DASHBOARD_LINKS.find((item) => item.slug === slug);

  if (!link) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  if (action === "pin") {
    const pinCount = await prisma.dashboardLinkPin.count({ where: { userId } });
    if (pinCount < 5) {
      await prisma.dashboardLinkPin.upsert({
        where: { userId_slug: { userId, slug } },
        create: { userId, slug },
        update: {},
      });
    }
  } else {
    await prisma.dashboardLinkPin.deleteMany({
      where: { userId, slug },
    });
  }

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
