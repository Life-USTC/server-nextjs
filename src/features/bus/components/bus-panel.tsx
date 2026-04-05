"use client";

import { Eye, EyeOff, Pin, Settings2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/** Get the time at a specific campus from a trip's stop times */
function getCampusTime(
  trip: BusTripSummary,
  campusId: number | null,
): string | null {
  if (campusId == null) return trip.departureTime;
  const stopTime = trip.stopTimes.find((st) => st.campusId === campusId);
  return stopTime?.time ?? trip.departureTime;
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

/** Campus filter pills — uses dashboard toolbar styling */
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

/** Route card in sidebar — subtle card styling with pinned indicator */
function RouteCard({
  match,
  isSelected,
  isPinned,
  campusFilterId,
  onSelect,
  t,
}: {
  match: BusRouteMatch;
  isSelected: boolean;
  isPinned: boolean;
  campusFilterId: number | null;
  onSelect: () => void;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  const relevantTime = match.nextTrip
    ? getCampusTime(match.nextTrip, campusFilterId)
    : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        isSelected
          ? "border-primary/30 bg-primary/8 text-foreground shadow-sm"
          : "border-border/50 bg-card/60 text-muted-foreground hover:border-border/80 hover:bg-card/80 hover:text-foreground hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-2">
        {isPinned && (
          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm",
              isSelected ? "font-semibold" : "font-medium",
            )}
          >
            {match.route.descriptionPrimary}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {match.nextTrip ? (
              <>
                <span className="font-mono tabular-nums">{relevantTime}</span>
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
        </div>
      </div>
    </button>
  );
}

/** Trip schedule table — stations as column headers, trips as rows */
function TripScheduleTable({
  match,
  campusFilterId,
  showDeparted,
  t,
}: {
  match: BusRouteMatch;
  campusFilterId: number | null;
  showDeparted: boolean;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  const stops = match.route.stops;
  const trips = showDeparted ? match.allTrips : match.upcomingTrips;

  if (trips.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            {stops.map((stop) => (
              <TableHead
                key={stop.stopOrder}
                className={cn(
                  "font-medium text-xs",
                  campusFilterId === stop.campus.id &&
                    "font-semibold text-primary",
                )}
              >
                {stop.campus.namePrimary}
              </TableHead>
            ))}
            <TableHead className="text-right font-medium text-xs">
              {t("tableStatusHeader")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((trip) => (
            <TableRow
              key={trip.id}
              className={cn(
                trip.status === "departed" &&
                  "text-muted-foreground opacity-60",
              )}
            >
              {stops.map((stop) => {
                const stopTime = trip.stopTimes.find(
                  (st) => st.stopOrder === stop.stopOrder,
                );
                return (
                  <TableCell
                    key={stop.stopOrder}
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      campusFilterId === stop.campus.id &&
                        "font-semibold text-primary",
                    )}
                  >
                    {stopTime?.time ?? "—"}
                  </TableCell>
                );
              })}
              <TableCell className="text-right text-sm">
                {trip.status === "departed" ? (
                  <span className="text-muted-foreground text-xs">
                    {t("departed")}
                  </span>
                ) : (
                  <span className="font-mono text-primary text-xs tabular-nums">
                    {formatEtaShort(trip.minutesUntilDeparture)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Detail panel: next bus hero + trip schedule table */
function RouteDetail({
  match,
  campusFilterId,
  showDeparted,
  t,
}: {
  match: BusRouteMatch;
  campusFilterId: number | null;
  showDeparted: boolean;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  return (
    <div className="space-y-5">
      {/* Route header */}
      <div className="flex items-center gap-2">
        {match.isFavoriteRoute && (
          <Pin className="h-4 w-4 shrink-0 text-primary" />
        )}
        <h3 className="text-balance font-semibold text-base">
          {match.route.descriptionPrimary}
        </h3>
        <Badge variant="outline" size="sm" className="shrink-0">
          {t("route.totalTrips", { count: match.totalTrips })}
        </Badge>
      </div>

      {/* Next bus hero */}
      {match.nextTrip ? (
        <div className="rounded-xl border border-border/50 bg-card/60 p-4">
          <p className="mb-1 text-muted-foreground text-xs">
            {t("nextDeparture")}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono font-semibold text-3xl tabular-nums">
              {getCampusTime(match.nextTrip, campusFilterId)}
            </span>
            <span className="text-primary text-sm">
              {formatEta(match.nextTrip.minutesUntilDeparture, t)}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-muted-foreground text-xs tabular-nums">
            {match.nextTrip.stopTimes
              .map((s) => `${s.time ?? "—"} ${s.campusName}`)
              .join(" → ")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">{t("noMoreBusToday")}</p>
        </div>
      )}

      {/* Trip schedule table */}
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
        <TripScheduleTable
          match={match}
          campusFilterId={campusFilterId}
          showDeparted={showDeparted}
          t={t}
        />
      </div>
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
  const [showDeparted, setShowDeparted] = useState(
    data.preferences?.showDepartedTrips ?? false,
  );

  // Filter matches: campus = any non-terminal stop the route passes through
  const filteredMatches = useMemo(() => {
    let matches = data.matches;
    if (originFilter != null) {
      matches = matches.filter((m) =>
        m.route.stops.slice(0, -1).some((s) => s.campus.id === originFilter),
      );
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

  // Split pinned vs regular routes
  const { pinnedMatches, regularMatches } = useMemo(() => {
    const pinned: BusRouteMatch[] = [];
    const regular: BusRouteMatch[] = [];
    for (const m of filteredMatches) {
      if (m.isFavoriteRoute) pinned.push(m);
      else regular.push(m);
    }
    return { pinnedMatches: pinned, regularMatches: regular };
  }, [filteredMatches]);

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

  const renderRouteCard = (match: BusRouteMatch) => (
    <RouteCard
      key={match.route.id}
      match={match}
      isSelected={selectedMatch?.route.id === match.route.id}
      isPinned={match.isFavoriteRoute}
      campusFilterId={originFilter}
      onSelect={() => setSelectedRouteId(match.route.id)}
      t={t}
    />
  );

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDeparted((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              showDeparted
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={showDeparted}
            aria-label={t("query.showDepartedTrips")}
          >
            {showDeparted ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {t("query.showDepartedTrips")}
            </span>
          </button>
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
        </div>
      </DashboardTabToolbar>

      {/* Empty state */}
      {filteredMatches.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          {t("query.empty")}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(200px,280px)_1fr]">
          {/* Left: route sidebar with pinned/regular sections */}
          <nav
            className="space-y-1 md:border-border/50 md:border-r md:pr-4"
            aria-label={t("allRoutesLabel")}
          >
            {pinnedMatches.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-1 pb-1 text-muted-foreground text-xs">
                  <Pin className="h-3 w-3" />
                  {t("route.favorite")}
                </p>
                {pinnedMatches.map(renderRouteCard)}
                {regularMatches.length > 0 && (
                  <div className="!mt-3 border-border/30 border-t pt-2">
                    <p className="px-1 pb-1 text-muted-foreground text-xs">
                      {t("allRoutesLabel")}
                    </p>
                  </div>
                )}
              </>
            )}
            {regularMatches.map(renderRouteCard)}
          </nav>

          {/* Right: detail panel */}
          <div className="min-w-0">
            {selectedMatch ? (
              <RouteDetail
                match={selectedMatch}
                campusFilterId={originFilter}
                showDeparted={showDeparted}
                t={t}
              />
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
