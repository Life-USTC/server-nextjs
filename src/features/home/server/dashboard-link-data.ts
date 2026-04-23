import { pinyin } from "pinyin-pro";
import type {
  DashboardLinkGroup,
  DashboardLinkIcon,
} from "@/features/dashboard-links/lib/dashboard-links";
import {
  DASHBOARD_LINK_GROUPS,
  getDashboardLinkGroup,
  recommendDashboardLinks,
  USTC_DASHBOARD_LINKS,
} from "@/features/dashboard-links/lib/dashboard-links";
import { prisma } from "@/lib/db/prisma";

/** Lowercase pinyin (no tones, no spaces) for client-side search and IME. */
function toSearchPinyin(text: string): string {
  if (!text.trim()) return "";
  return pinyin(text, { toneType: "none" }).replace(/\s+/g, "").toLowerCase();
}

export type DashboardLinkSummary = {
  slug: string;
  title: string;
  url: string;
  description: string;
  /** Pinyin of title for search (lowercase, no spaces). */
  titlePinyin: string;
  /** Pinyin of description for search (lowercase, no spaces). */
  descriptionPinyin: string;
  icon: DashboardLinkIcon;
  group: DashboardLinkGroup;
  isPinned: boolean;
  clickCount: number;
};

export type DashboardLinksData = {
  dashboardLinks: DashboardLinkSummary[];
  recommendedLinks: DashboardLinkSummary[];
  pinnedLinks: DashboardLinkSummary[];
  overviewLinks: DashboardLinkSummary[];
};

function toDashboardLinkSummary(
  link: (typeof USTC_DASHBOARD_LINKS)[number],
  clickStats: Record<string, number>,
  pinnedSlugSet: Set<string>,
): DashboardLinkSummary {
  return {
    ...link,
    titlePinyin: toSearchPinyin(link.title),
    descriptionPinyin: toSearchPinyin(link.description),
    group: getDashboardLinkGroup(link.slug),
    isPinned: pinnedSlugSet.has(link.slug),
    clickCount: clickStats[link.slug] ?? 0,
  };
}

export function getPublicDashboardLinksData(): {
  dashboardLinks: DashboardLinkSummary[];
  overviewLinks: DashboardLinkSummary[];
} {
  const emptyClickStats: Record<string, number> = {};
  const emptyPinnedSet = new Set<string>();
  const dashboardLinks = USTC_DASHBOARD_LINKS.map((link) =>
    toDashboardLinkSummary(link, emptyClickStats, emptyPinnedSet),
  );
  const dashboardLinkBySlug = new Map(
    dashboardLinks.map((link) => [link.slug, link] as const),
  );
  const overviewLinks = DASHBOARD_LINK_GROUPS.mostClicked
    .slice(0, 5)
    .flatMap((slug) => {
      const link = dashboardLinkBySlug.get(slug);
      return link ? [link] : [];
    });

  return {
    dashboardLinks,
    overviewLinks,
  };
}

export async function getSignedInDashboardLinksData(
  userId: string,
): Promise<DashboardLinksData> {
  const [clickRows, pinRows] = await Promise.all([
    prisma.dashboardLinkClick.findMany({
      where: { userId },
      select: { slug: true, count: true },
    }),
    prisma.dashboardLinkPin.findMany({
      where: { userId },
      select: { slug: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const clickStats: Record<string, number> = Object.fromEntries(
    clickRows.map((row) => [row.slug, row.count]),
  );
  const pinnedSlugSet = new Set(pinRows.map((row) => row.slug));

  const dashboardLinks = USTC_DASHBOARD_LINKS.map((link) =>
    toDashboardLinkSummary(link, clickStats, pinnedSlugSet),
  );
  const dashboardLinkBySlug = new Map(
    dashboardLinks.map((link) => [link.slug, link] as const),
  );
  const pinnedLinks = pinRows.flatMap((row) => {
    const link = dashboardLinkBySlug.get(row.slug);
    return link ? [link] : [];
  });
  const recommendedLinks = recommendDashboardLinks(clickStats, {
    limit: USTC_DASHBOARD_LINKS.length,
    excludeSlugs: Array.from(pinnedSlugSet),
  }).map((link) => toDashboardLinkSummary(link, clickStats, pinnedSlugSet));
  const overviewLinks = [...pinnedLinks, ...recommendedLinks].slice(0, 5);

  return {
    dashboardLinks,
    recommendedLinks,
    pinnedLinks,
    overviewLinks,
  };
}

export async function getLinksTabData(userId: string) {
  return getSignedInDashboardLinksData(userId);
}
