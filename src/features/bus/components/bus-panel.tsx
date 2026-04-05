"use client";

import { Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import {
  DashboardTabToolbar,
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BusPreferenceForm } from "@/features/bus/components/bus-preference-form";
import type {
  BusCampusSummary,
  BusQueryResult,
  BusRouteMatch,
  BusTripSummary,
} from "@/features/bus/lib/bus-types";
import { cn } from "@/shared/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatEta(
  minutes: number | null,
  t: (key: string, values?: Record<string, number | string>) => string,
): string | null {
  if (minutes == null) return null;
  if (minutes <= 0) return t("recommended.departIn", { count: 0 });
  return t("recommended.departIn", { count: minutes });
}

function formatEtaShort(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function stopTimeChain(trip: BusTripSummary): string {
  return trip.stopTimes
    .map((s) => (s.time ? `${s.time} ${s.campusName}` : `— ${s.campusName}`))
    .join(" → ");
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

/** Pill toggle for weekday / weekend — uses dashboard toolbar styling */
function DayTypePills({
  value,
  onChange,
  t,
}: {
  value: "weekday" | "weekend";
  onChange: (v: "weekday" | "weekend") => void;
  t: (key: string) => string;
}) {
  return (
    <DashboardTabToolbarGroup>
      {(["weekday", "weekend"] as const).map((dt) => (
        <button
          key={dt}
          type="button"
          aria-pressed={value === dt}
          onClick={() => onChange(dt)}
          className={dashboardTabToolbarItemClass(value === dt)}
        >
          {t(`dayType.${dt}`)}
        </button>
      ))}
    </DashboardTabToolbarGroup>
  );
}

/** Campus origin filter pills — uses dashboard toolbar styling */
function CampusFilter({
  campuses,
  selectedId,
  onSelect,
  allLabel,
}: {
  campuses: BusCampusSummary[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  allLabel: string;
}) {
  return (
    <DashboardTabToolbarGroup>
      <button
        type="button"
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null)}
        className={dashboardTabToolbarItemClass(selectedId === null)}
      >
        {allLabel}
      </button>
      {campuses.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={selectedId === c.id}
          aria-label={`${allLabel}: ${c.namePrimary}`}
          onClick={() => onSelect(c.id === selectedId ? null : c.id)}
          className={dashboardTabToolbarItemClass(selectedId === c.id)}
        >
          {c.namePrimary}
        </button>
      ))}
    </DashboardTabToolbarGroup>
  );
}

/** Route list item in sidebar */
function RouteListItem({
  match,
  isSelected,
  onSelect,
  t,
}: {
  match: BusRouteMatch;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        isSelected
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <p
        className={cn(
          "truncate text-sm",
          isSelected ? "font-semibold" : "font-medium",
        )}
      >
        {match.route.descriptionPrimary}
      </p>
      <div className="mt-0.5 flex items-center gap-2 text-xs">
        {match.nextTrip ? (
          <>
            <span className="tabular-nums">{match.nextTrip.departureTime}</span>
            <span className="text-muted-foreground">
              {t("route.upcomingTrips", {
                count: match.upcomingTrips.length,
              })}
            </span>
          </>
        ) : (
          <span>{t("noMoreBusToday")}</span>
        )}
      </div>
    </button>
  );
}

/** Detail panel: next bus hero + full trip list */
function RouteDetail({
  match,
  t,
}: {
  match: BusRouteMatch;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Route header */}
      <div className="flex items-baseline gap-2">
        <h3 className="text-balance font-semibold text-base">
          {match.route.descriptionPrimary}
        </h3>
        <Badge variant="outline" size="sm" className="shrink-0">
          {t("route.totalTrips", { count: match.totalTrips })}
        </Badge>
      </div>

      {/* Next bus hero */}
      {match.nextTrip ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t("nextDeparture")}</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-semibold text-3xl tabular-nums">
              {match.nextTrip.departureTime}
            </span>
            <span className="text-primary text-sm">
              {formatEta(match.nextTrip.minutesUntilDeparture, t)}
            </span>
          </div>
          <p className="text-muted-foreground text-xs tabular-nums">
            {stopTimeChain(match.nextTrip)}
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-muted/30 px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">{t("noMoreBusToday")}</p>
        </div>
      )}

      {/* Full trip list — no folding */}
      {match.allTrips.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
            <span>{t("allRoutesLabel")}</span>
            {match.upcomingTrips.length > 0 && (
              <span>
                {t("route.upcomingTrips", {
                  count: match.upcomingTrips.length,
                })}
              </span>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {match.allTrips.map((trip) => (
              <div
                key={trip.id}
                className={cn(
                  "flex items-baseline justify-between gap-3 py-2 text-sm",
                  trip.status === "departed" && "text-muted-foreground",
                )}
              >
                <span className="min-w-0 truncate text-xs tabular-nums">
                  {stopTimeChain(trip)}
                </span>
                {trip.status === "departed" ? (
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {t("departed")}
                  </span>
                ) : (
                  <span className="shrink-0 text-primary text-xs tabular-nums">
                    {formatEtaShort(trip.minutesUntilDeparture)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                        */
/* ------------------------------------------------------------------ */

type BusPanelProps = {
  data: BusQueryResult;
  signedIn?: boolean;
  initialPreference?: BusQueryResult["preferences"] | null;
  showPreferences?: boolean;
  className?: string;
};

export function BusPanel({
  data,
  signedIn = false,
  initialPreference = null,
  showPreferences = false,
  className,
}: BusPanelProps) {
  const t = useTranslations("bus");
  const router = useRouter();

  const [dayType, setDayType] = useState<"weekday" | "weekend">(data.todayType);
  const [originFilter, setOriginFilter] = useState<number | null>(
    data.preferences?.preferredOriginCampusId ?? null,
  );
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  // Filter matches: origin = first stop of route that user can board
  const filteredMatches = useMemo(() => {
    let matches = data.matches;
    if (originFilter != null) {
      matches = matches.filter((m) => {
        const firstStop = m.route.stops[0];
        return firstStop?.campus.id === originFilter;
      });
    }
    if (dayType !== data.todayType) {
      matches = matches.map((m) => ({
        ...m,
        nextTrip: null,
        upcomingTrips: [],
        visibleTrips: [],
        allTrips: [],
      }));
    }
    return matches;
  }, [data.matches, data.todayType, originFilter, dayType]);

  // Resolve selected route
  const selectedMatch = useMemo(() => {
    if (selectedRouteId != null) {
      const found = filteredMatches.find((m) => m.route.id === selectedRouteId);
      if (found) return found;
    }
    return filteredMatches[0] ?? null;
  }, [filteredMatches, selectedRouteId]);

  const handleDayTypeChange = useCallback((v: "weekday" | "weekend") => {
    setDayType(v);
    const url = new URL(window.location.href);
    url.searchParams.set("dayType", v);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleOriginChange = useCallback((id: number | null) => {
    setOriginFilter(id);
    setSelectedRouteId(null);
    const url = new URL(window.location.href);
    if (id != null) {
      url.searchParams.set("from", String(id));
    } else {
      url.searchParams.delete("from");
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls bar — matches other dashboard tab toolbars */}
      <DashboardTabToolbar>
        <div className="flex flex-wrap items-center gap-2">
          <DayTypePills value={dayType} onChange={handleDayTypeChange} t={t} />
          <CampusFilter
            campuses={data.campuses}
            selectedId={originFilter}
            onSelect={handleOriginChange}
            allLabel={t("query.originAny")}
          />
        </div>

        {showPreferences && signedIn ? (
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t("editPreferences")}
                />
              }
            >
              <Settings2 className="h-4 w-4" />
            </DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>{t("preferences.title")}</DialogTitle>
                <DialogDescription>
                  {t("preferences.description")}
                </DialogDescription>
              </DialogHeader>
              <DialogPanel>
                <BusPreferenceForm
                  campuses={data.campuses}
                  routes={data.routes}
                  preference={initialPreference ?? data.preferences}
                  signedIn={signedIn}
                  onSaved={() => router.refresh()}
                />
              </DialogPanel>
            </DialogPopup>
          </Dialog>
        ) : null}
      </DashboardTabToolbar>

      {/* Empty state */}
      {filteredMatches.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          {t("query.empty")}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(200px,280px)_1fr]">
          {/* Left: route sidebar */}
          <nav
            className="space-y-1 md:border-border/50 md:border-r md:pr-4"
            aria-label={t("allRoutesLabel")}
          >
            {filteredMatches.map((match) => (
              <RouteListItem
                key={match.route.id}
                match={match}
                isSelected={selectedMatch?.route.id === match.route.id}
                onSelect={() => setSelectedRouteId(match.route.id)}
                t={t}
              />
            ))}
          </nav>

          {/* Right: detail panel */}
          <div className="min-w-0">
            {selectedMatch ? (
              <RouteDetail match={selectedMatch} t={t} />
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                {t("query.empty")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notice banner — bottom */}
      {data.notice?.message ? (
        <p className="text-muted-foreground text-xs">
          {data.notice.url ? (
            <a
              href={data.notice.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {data.notice.message}
            </a>
          ) : (
            data.notice.message
          )}
        </p>
      ) : null}
    </div>
  );
}
