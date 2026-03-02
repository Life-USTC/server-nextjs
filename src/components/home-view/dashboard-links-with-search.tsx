"use client";

import {
  BookOpen,
  Building,
  ClipboardList,
  GraduationCap,
  Mail,
  MonitorPlay,
  Network,
  Pin,
  School,
  Search,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import type {
  DashboardLinkGroup,
  DashboardLinkIcon,
} from "@/lib/dashboard-links";

const ICON_MAP: Record<DashboardLinkIcon, typeof BookOpen> = {
  "book-open": BookOpen,
  building: Building,
  "clipboard-list": ClipboardList,
  "graduation-cap": GraduationCap,
  mail: Mail,
  "monitor-play": MonitorPlay,
  network: Network,
  school: School,
  users: Users,
};

export type GroupedLinksEntry = {
  group: DashboardLinkGroup;
  label: string;
  links: DashboardLinkSummary[];
};

/** Normalize search query: trim, collapse spaces, split into tokens. */
function searchQueryToTokens(query: string): string[] {
  const normalized = query.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function linkMatchesTokens(
  link: {
    title: string;
    description: string;
    titlePinyin: string;
    descriptionPinyin: string;
  },
  tokens: string[],
): boolean {
  const titleLower = link.title.toLowerCase();
  const descLower = (link.description ?? "").toLowerCase();
  const titlePy = link.titlePinyin;
  const descPy = link.descriptionPinyin ?? "";
  return tokens.every(
    (token) =>
      titleLower.includes(token) ||
      descLower.includes(token) ||
      titlePy.includes(token) ||
      descPy.includes(token),
  );
}

function filterGroupedBySearch(
  grouped: GroupedLinksEntry[],
  query: string,
): GroupedLinksEntry[] {
  const tokens = searchQueryToTokens(query);
  if (tokens.length === 0) return grouped;
  return grouped
    .map((entry) => ({
      ...entry,
      links: entry.links.filter((link) => linkMatchesTokens(link, tokens)),
    }))
    .filter((entry) => entry.links.length > 0);
}

function getInitialPinnedSlugSet(
  groupedLinks: GroupedLinksEntry[],
): Set<string> {
  return new Set(
    groupedLinks.flatMap((entry) =>
      entry.links.filter((link) => link.isPinned).map((link) => link.slug),
    ),
  );
}

export function DashboardLinksWithSearch({
  groupedLinks,
  children,
  showSearch = false,
}: {
  groupedLinks: GroupedLinksEntry[];
  children?: React.ReactNode;
  showSearch?: boolean;
}) {
  const t = useTranslations("meDashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedSlugSet, setPinnedSlugSet] = useState<Set<string>>(() =>
    getInitialPinnedSlugSet(groupedLinks),
  );
  const [pendingSlugSet, setPendingSlugSet] = useState<Set<string>>(
    () => new Set(),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPinnedSlugSet(getInitialPinnedSlugSet(groupedLinks));
  }, [groupedLinks]);

  const groupedLinksWithPinnedState = groupedLinks.map((entry) => ({
    ...entry,
    links: entry.links.map((link) => ({
      ...link,
      isPinned: pinnedSlugSet.has(link.slug),
    })),
  }));

  const filteredGroups = filterGroupedBySearch(
    groupedLinksWithPinnedState,
    searchQuery,
  );

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const onPinToggle = useCallback(
    async (slug: string, currentlyPinned: boolean) => {
      if (pendingSlugSet.has(slug)) return;

      setPendingSlugSet((prev) => {
        const next = new Set(prev);
        next.add(slug);
        return next;
      });

      try {
        const response = await fetch("/api/dashboard-links/pin", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: new URLSearchParams({
            slug,
            action: currentlyPinned ? "unpin" : "pin",
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as { isPinned?: boolean };
        if (typeof data.isPinned !== "boolean") return;

        setPinnedSlugSet((prev) => {
          const next = new Set(prev);
          if (data.isPinned) {
            next.add(slug);
          } else {
            next.delete(slug);
          }
          return next;
        });
      } finally {
        setPendingSlugSet((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [pendingSlugSet],
  );

  useEffect(() => {
    if (!showSearch) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSearch, focusSearch]);

  return (
    <div className="space-y-4">
      {showSearch && (
        <div>
          <div className="relative">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              aria-label={t("linkHub.searchPlaceholder")}
              placeholder={t("linkHub.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="mt-1 text-right text-muted-foreground text-xs">
            {t("linkHub.searchShortcutHint")}
          </p>
        </div>
      )}
      {filteredGroups.map((entry, index) => (
        <section
          key={`${entry.group}-${index}`}
          className={entry.label ? "space-y-1.5" : undefined}
        >
          {entry.label ? (
            <h3 className="font-medium text-muted-foreground text-sm">
              {entry.label}
            </h3>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entry.links.map((link) => {
              const Icon = ICON_MAP[link.icon];
              const pinLabel = link.isPinned
                ? t("linkHub.unpin")
                : t("linkHub.pin");
              const isPending = pendingSlugSet.has(link.slug);
              return (
                <div
                  key={link.slug}
                  className="group relative min-w-0 overflow-hidden rounded-lg border"
                >
                  <form
                    action="/api/dashboard-links/visit"
                    method="post"
                    target="_blank"
                    rel="noopener"
                  >
                    <input type="hidden" name="slug" value={link.slug} />
                    <button
                      type="submit"
                      className="block min-h-28 w-full p-2.5 text-left no-underline transition-colors hover:bg-accent"
                    >
                      <div className="mb-1.5 flex items-start gap-1.5">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="line-clamp-2 font-medium text-sm">
                          {link.title}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-muted-foreground text-xs">
                        {link.description}
                      </p>
                    </button>
                  </form>
                  <div className="pointer-events-auto absolute top-2 right-2 opacity-100 transition-opacity md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => onPinToggle(link.slug, link.isPinned)}
                      disabled={isPending}
                      aria-label={pinLabel}
                      title={pinLabel}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card/95 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pin
                        className={`h-4 w-4 ${link.isPinned ? "fill-current text-primary" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {children}
    </div>
  );
}
