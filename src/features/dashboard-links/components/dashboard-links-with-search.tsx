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
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DashboardLinkSummary } from "@/app/dashboard/dashboard-data";
import { FiltersBar, FiltersBarSearch } from "@/components/filters/filters-bar";
import { Button } from "@/components/ui/button";
import type {
  DashboardLinkGroup,
  DashboardLinkIcon,
} from "../lib/dashboard-links";

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

export function DashboardLinksWithSearch({
  groupedLinks,
  returnTo,
  children,
  showSearch = false,
}: {
  groupedLinks: GroupedLinksEntry[];
  returnTo: string;
  children?: React.ReactNode;
  showSearch?: boolean;
}) {
  const t = useTranslations("meDashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [linksState, setLinksState] = useState(groupedLinks);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLinksState(groupedLinks);
  }, [groupedLinks]);

  const filteredGroups = useMemo(
    () => filterGroupedBySearch(linksState, deferredSearchQuery),
    [deferredSearchQuery, linksState],
  );

  const handlePinSubmit = useCallback(
    async (slug: string, nextAction: "pin" | "unpin") => {
      setUpdatingSlug(slug);
      try {
        const formData = new FormData();
        formData.set("slug", slug);
        formData.set("action", nextAction);
        formData.set("returnTo", returnTo);

        const response = await fetch("/api/dashboard-links/pin", {
          method: "POST",
          body: formData,
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) return;
        const data = (await response.json()) as {
          pinnedSlugs?: string[];
        };
        const pinnedSlugs = new Set(data.pinnedSlugs ?? []);

        setLinksState((previous) =>
          previous.map((entry) => ({
            ...entry,
            links: entry.links.map((link) => ({
              ...link,
              isPinned: pinnedSlugs.has(link.slug),
            })),
          })),
        );
      } finally {
        setUpdatingSlug(null);
      }
    },
    [returnTo],
  );

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
  }, []);

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
          <FiltersBar className="mb-2">
            <FiltersBarSearch
              inputRef={inputRef}
              ariaLabel={t("linkHub.searchPlaceholder")}
              placeholder={t("linkHub.searchPlaceholder")}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </FiltersBar>
          <p className="text-right text-muted-foreground text-xs">
            {t("linkHub.searchShortcutHint")}
          </p>
        </div>
      )}
      {filteredGroups.map((entry, index) => (
        <section
          key={`${entry.group}-${index}`}
          className={entry.label ? "space-y-2" : undefined}
        >
          {entry.label ? (
            <h3 className="font-medium text-muted-foreground text-sm">
              {entry.label}
            </h3>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entry.links.map((link) => {
              const Icon = ICON_MAP[link.icon];
              const pinLabel = link.isPinned
                ? t("linkHub.unpin")
                : t("linkHub.pin");
              return (
                <div
                  key={link.slug}
                  className="group relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/72 transition-colors hover:bg-background/90"
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
                      className="flex min-h-24 w-full flex-col justify-between gap-3 px-3.5 py-3 text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/85 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="line-clamp-2 font-medium text-sm leading-5">
                            {link.title}
                          </p>
                          <p className="line-clamp-2 text-muted-foreground text-xs leading-5">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </form>
                  <form
                    action="/api/dashboard-links/pin"
                    method="post"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handlePinSubmit(
                        link.slug,
                        link.isPinned ? "unpin" : "pin",
                      );
                    }}
                    className={`pointer-events-auto absolute top-2 right-2 opacity-100 transition-opacity ${link.isPinned ? "" : "md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"}`}
                  >
                    <input type="hidden" name="slug" value={link.slug} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input
                      type="hidden"
                      name="action"
                      value={link.isPinned ? "unpin" : "pin"}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon-sm"
                      disabled={updatingSlug === link.slug}
                      aria-label={pinLabel}
                      title={pinLabel}
                      className="bg-background/90"
                    >
                      <Pin
                        className={`h-4 w-4 ${link.isPinned ? "fill-current text-primary" : ""}`}
                      />
                    </Button>
                  </form>
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
