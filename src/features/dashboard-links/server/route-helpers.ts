import { NextResponse } from "next/server";
import { USTC_DASHBOARD_LINKS } from "@/features/dashboard-links/lib/dashboard-links";

export const MAX_PINNED_LINKS = 5;

export type PinApiResponse = {
  pinnedSlugs: string[];
  maxPinnedLinks: number;
  error?: string | null;
};

export function resolveDashboardLinkBySlug(slug: string | null | undefined) {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) return null;
  return (
    USTC_DASHBOARD_LINKS.find((link) => link.slug === normalizedSlug) ?? null
  );
}

export function sanitizeDashboardReturnTo(value: string | undefined): string {
  if (!value?.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (/[\\\r\n]/.test(value)) return "/";
  return value;
}

export function jsonOrRedirectForPinnedLinks({
  request,
  wantsJson,
  pinnedSlugs,
  returnTo,
  status = 200,
  error = null,
}: {
  request: Request;
  wantsJson: boolean;
  pinnedSlugs: string[];
  returnTo: string;
  status?: number;
  error?: string | null;
}) {
  if (wantsJson) {
    return NextResponse.json<PinApiResponse>(
      { pinnedSlugs, maxPinnedLinks: MAX_PINNED_LINKS, error },
      { status },
    );
  }

  const redirectUrl = new URL(returnTo, request.url);
  if (status >= 400) {
    redirectUrl.searchParams.set("dashboardLinkPinError", "1");
  } else {
    redirectUrl.searchParams.delete("dashboardLinkPinError");
  }

  return NextResponse.redirect(redirectUrl, 303);
}
