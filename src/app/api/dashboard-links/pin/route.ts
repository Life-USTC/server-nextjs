import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dashboardLinkPinRequestSchema } from "@/lib/api-schemas/request-schemas";
import { USTC_DASHBOARD_LINKS } from "@/lib/dashboard-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_PINNED_LINKS = 5;

function sanitizeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
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
  const formData = await request.formData();
  const parsedBody = dashboardLinkPinRequestSchema.safeParse({
    slug: formData.get("slug"),
    returnTo: formData.get("returnTo"),
    action: formData.get("action"),
  });

  if (!parsedBody.success) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const { slug } = parsedBody.data;
  const returnTo = sanitizeReturnTo(parsedBody.data.returnTo);
  const action = parsedBody.data.action === "unpin" ? "unpin" : "pin";
  const link = USTC_DASHBOARD_LINKS.find((item) => item.slug === slug);

  if (!link) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  try {
    if (action === "pin") {
      await prisma.$transaction(async (tx) => {
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
      });
    } else {
      await prisma.dashboardLinkPin.deleteMany({
        where: { userId, slug },
      });
    }
  } catch (error) {
    console.error("Failed to update dashboard link pin state", {
      userId,
      slug,
      action,
      error,
    });
  }

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
