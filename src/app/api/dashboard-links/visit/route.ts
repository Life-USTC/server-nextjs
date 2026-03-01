import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  dashboardLinkVisitQuerySchema,
  dashboardLinkVisitRequestSchema,
} from "@/lib/api-schemas/request-schemas";
import { USTC_DASHBOARD_LINKS } from "@/lib/dashboard-links";
import { prisma } from "@/lib/prisma";
import { resolveRequestRelativeUrl } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

function resolveLinkBySlug(slug: string | null | undefined) {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) return null;
  return (
    USTC_DASHBOARD_LINKS.find((link) => link.slug === normalizedSlug) ?? null
  );
}

/**
 * Redirect to one dashboard link without side effects.
 * @params dashboardLinkVisitQuerySchema
 * @response 307
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = dashboardLinkVisitQuerySchema.safeParse({
    slug: searchParams.get("slug"),
  });
  const target = parsedQuery.success
    ? resolveLinkBySlug(parsedQuery.data.slug)
    : null;

  if (!target) {
    return NextResponse.redirect(resolveRequestRelativeUrl("/", request));
  }

  return NextResponse.redirect(target.url);
}

/**
 * Record one dashboard link visit and redirect.
 * @body dashboardLinkVisitRequestSchema
 * @response 303
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const parsedBody = dashboardLinkVisitRequestSchema.safeParse({
    slug: formData.get("slug"),
  });
  const target = parsedBody.success
    ? resolveLinkBySlug(parsedBody.data.slug)
    : null;

  if (!target) {
    return NextResponse.redirect(resolveRequestRelativeUrl("/", request), 303);
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    try {
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
    } catch (error) {
      console.error("Failed to record dashboard link click", {
        userId,
        slug: target.slug,
        error,
      });
    }
  }

  return NextResponse.redirect(target.url, 303);
}
