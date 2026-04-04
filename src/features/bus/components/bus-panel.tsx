"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
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

function stopTimeChain(trip: BusTripSummary): string {
  return trip.stopTimes
    .map((s) => (s.time ? `${s.time} ${s.campusName}` : `— ${s.campusName}`))
    .join(" → ");
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

/** Pill toggle for weekday / weekend */
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
    <div className="inline-flex gap-1 rounded-full border border-border p-0.5">
      {(["weekday", "weekend"] as const).map((dt) => (
        <button
          key={dt}
          type="button"
          aria-pressed={value === dt}
          onClick={() => onChange(dt)}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
            value === dt
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`dayType.${dt}`)}
        </button>
      ))}
    </div>
  );
}

/** Campus origin filter pills */
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
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full border px-3 py-1.5 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          selectedId === null
            ? "border-border/80 bg-card text-foreground"
            : "border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground",
        )}
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
          className={cn(
            "rounded-full border px-3 py-1.5 font-medium text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
            selectedId === c.id
              ? "border-border/80 bg-card text-foreground"
              : "border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground",
          )}
        >
          {c.namePrimary}
        </button>
      ))}
    </div>
  );
}

/** Next-bus hero for a single route match */
function NextBusHero({
  match,
  t,
}: {
  match: BusRouteMatch;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  const trip = match.nextTrip;
  if (!trip) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        {t("noMoreBusToday")}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-semibold text-3xl tabular-nums">
          {trip.departureTime}
        </span>
        <span className="text-primary text-sm">
          {formatEta(trip.minutesUntilDeparture, t)}
        </span>
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        {stopTimeChain(trip)}
      </p>
    </div>
  );
}

/** Compact trip row for the collapsible list */
function TripRow({
  trip,
  departedLabel,
}: {
  trip: BusTripSummary;
  departedLabel: string;
}) {
  const etaText =
    trip.minutesUntilDeparture != null && trip.minutesUntilDeparture > 0
      ? trip.minutesUntilDeparture < 60
        ? `${trip.minutesUntilDeparture}min`
        : `${Math.floor(trip.minutesUntilDeparture / 60)}h${trip.minutesUntilDeparture % 60 > 0 ? `${trip.minutesUntilDeparture % 60}m` : ""}`
      : null;

  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5 text-sm",
        trip.status === "departed" && "text-muted-foreground",
      )}
    >
      <span className="min-w-0 truncate text-xs tabular-nums">
        {stopTimeChain(trip)}
      </span>
      {trip.status === "departed" ? (
        <span className="shrink-0 text-muted-foreground text-xs">
          {departedLabel}
        </span>
      ) : etaText ? (
        <span className="shrink-0 text-primary text-xs tabular-nums">
          {etaText}
        </span>
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
  compact?: boolean;
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

  // Local filter state
  const [dayType, setDayType] = useState<"weekday" | "weekend">(data.todayType);
  const [originFilter, setOriginFilter] = useState<number | null>(
    data.preferences?.preferredOriginCampusId ?? null,
  );

  // Filter matches by origin campus and day type
  const filteredMatches = useMemo(() => {
    let matches = data.matches;
    if (originFilter != null) {
      matches = matches.filter((m) =>
        m.route.stops.some((s) => s.campus.id === originFilter),
      );
    }
    // Day type filter: only show trips matching the selected day type
    if (dayType !== data.todayType) {
      // When viewing a different day type, hide matches since trip data
      // is for today's type only; show all routes but mark "no trips"
      matches = matches.map((m) => ({
        ...m,
        nextTrip: null,
        upcomingTrips: [],
        visibleTrips: [],
        allTrips: dayType === data.todayType ? m.allTrips : [],
      }));
    }
    return matches;
  }, [data.matches, data.todayType, originFilter, dayType]);

  // The first match is the recommended/best one
  const topMatch = filteredMatches[0] ?? null;

  const handleDayTypeChange = useCallback((v: "weekday" | "weekend") => {
    setDayType(v);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("dayType", v);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleOriginChange = useCallback((id: number | null) => {
    setOriginFilter(id);
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
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <DayTypePills value={dayType} onChange={handleDayTypeChange} t={t} />

        <span className="hidden h-5 w-px bg-border sm:block" />

        <CampusFilter
          campuses={data.campuses}
          selectedId={originFilter}
          onSelect={handleOriginChange}
          allLabel={t("query.originAny")}
        />

        {showPreferences && signedIn ? (
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
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
                  preference={initialPreference ?? data.preferences}
                  signedIn={signedIn}
                />
              </DialogPanel>
            </DialogPopup>
          </Dialog>
        ) : null}
      </div>

      {/* Notice banner */}
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

      {/* Empty state */}
      {filteredMatches.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground text-sm">
          {t("query.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Hero: next bus from top match */}
          {topMatch ? (
            <section>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="font-medium text-sm">
                  {topMatch.route.descriptionPrimary}
                </h3>
                {topMatch.nextTrip ? (
                  <Badge variant="default" size="sm">
                    {t("bestMatch")}
                  </Badge>
                ) : null}
              </div>
              <NextBusHero match={topMatch} t={t} />
            </section>
          ) : null}

          {/* All routes as collapsible details */}
          {filteredMatches.map((match, i) => {
            const isTop = i === 0;
            const remainingTrips = match.visibleTrips.filter(
              (trip) => !isTop || trip.id !== match.nextTrip?.id,
            );

            return (
              <details
                key={match.route.id}
                open={isTop && remainingTrips.length > 0}
                className="group"
              >
                <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent/30 [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    <span className="truncate font-medium text-sm">
                      {isTop
                        ? t("upcomingTrips")
                        : match.route.descriptionPrimary}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
                    {!isTop && match.nextTrip ? (
                      <span className="tabular-nums">
                        {match.nextTrip.departureTime}
                      </span>
                    ) : null}
                    <span>
                      {match.upcomingTrips.length > 0
                        ? t("route.upcomingTrips", {
                            count: match.upcomingTrips.length,
                          })
                        : t("route.totalTrips", {
                            count: match.totalTrips,
                          })}
                    </span>
                  </div>
                </summary>

                <div className="ml-2.5 space-y-0 border-border/50 border-l-2 py-1 pl-4">
                  {/* For non-top routes, show next bus inline */}
                  {!isTop && match.nextTrip ? (
                    <div className="pb-1">
                      <NextBusHero match={match} t={t} />
                    </div>
                  ) : null}
                  {(isTop ? remainingTrips : match.allTrips).map((trip) => (
                    <TripRow
                      key={trip.id}
                      trip={trip}
                      departedLabel={t("departed")}
                    />
                  ))}
                  {match.allTrips.length === 0 ? (
                    <p className="py-2 text-muted-foreground text-xs">
                      {t("noMoreBusToday")}
                    </p>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
