"use client";

import {
  Bus,
  ChevronDown,
  Clock3,
  Route,
  Settings2,
  Sparkles,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusPreferenceForm } from "@/features/bus/components/bus-preference-form";
import type { BusQueryResult } from "@/features/bus/lib/bus-types";
import { cn } from "@/shared/lib/utils";

function formatMinutes(minutes: number | null) {
  if (minutes == null) return null;
  if (minutes <= 0) return "即将发车";
  if (minutes < 60) return `${minutes} 分钟后`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小时后` : `${hours} 小时 ${rest} 分钟后`;
}

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
  compact = false,
  className,
}: BusPanelProps) {
  const t = useTranslations("bus");
  const [showSettings, setShowSettings] = useState(false);

  const alternativeMatches = useMemo(
    () =>
      data.recommended
        ? data.matches
            .filter((item) => item.route.id !== data.recommended?.route.id)
            .slice(0, compact ? 2 : 3)
        : data.matches.slice(0, compact ? 2 : 3),
    [compact, data.matches, data.recommended],
  );

  const topMetrics = useMemo(
    () => [
      {
        label: t("query.origin"),
        value:
          data.recommended?.originStop.campus.namePrimary ??
          initialPreference?.preferredOriginCampusId?.toString() ??
          t("query.originAny"),
      },
      {
        label: t("query.destination"),
        value:
          data.recommended?.destinationStop.campus.namePrimary ??
          initialPreference?.preferredDestinationCampusId?.toString() ??
          t("query.destinationAny"),
      },
      {
        label: t("recommended.nextTrip"),
        value: data.recommended?.nextTrip?.departureTime ?? "—",
      },
      {
        label: t("allRoutes.title"),
        value: `${data.matches.length}`,
      },
    ],
    [data.matches.length, data.recommended, initialPreference, t],
  );

  const shouldShowAllRoutes =
    data.matches.length > 1 || (!compact && data.matches.length > 0);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
        <div className="border-border/70 border-b bg-gradient-to-br from-primary/8 via-background to-background px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs">
                <Bus className="h-3.5 w-3.5" />
                {t("dashboardTitle")}
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-xl">{t("title")}</h2>
                <p className="max-w-2xl text-muted-foreground text-sm">
                  {signedIn ? t("dashboardDescription") : t("description")}
                </p>
              </div>
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

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" size="default" className="border-0">
                {t("activeVersion")}: {data.version?.title ?? "—"}
              </Badge>
              <Badge variant="outline" size="default" className="border-0">
                {data.todayType === "weekday"
                  ? t("dayType.weekday")
                  : t("dayType.weekend")}
              </Badge>
              {showPreferences ? (
                <Button
                  variant={showSettings ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowSettings((value) => !value)}
                >
                  <Settings2 className="h-4 w-4" />
                  {showSettings ? t("hidePreferences") : t("editPreferences")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {topMetrics.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3"
              >
                <p className="text-muted-foreground text-xs">{item.label}</p>
                <p className="mt-1 font-medium text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {showSettings && showPreferences ? (
          <div className="border-border/70 border-b px-6 py-5">
            <BusPreferenceForm
              campuses={data.campuses}
              preference={initialPreference ?? data.preferences}
              signedIn={signedIn}
            />
          </div>
        ) : null}

        {data.matches.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            {t("query.empty")}
          </div>
        ) : (
          <div className="space-y-6 px-6 py-6">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-xs">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-base">
                        {t("recommended.title")}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {t("recommended.description")}
                    </p>
                  </div>
                  {data.recommended ? (
                    <Badge variant="default" size="sm">
                      {t("bestMatch")}
                    </Badge>
                  ) : null}
                </div>

                {data.recommended ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-primary/20 bg-background px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-lg">
                            {data.recommended.route.descriptionPrimary}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {data.recommended.route.descriptionSecondary ??
                              `${data.recommended.originStop.campus.namePrimary} -> ${data.recommended.destinationStop.campus.namePrimary}`}
                          </p>
                        </div>
                        <Badge variant="outline" size="sm">
                          <Route className="h-3.5 w-3.5" />
                          {t("route.totalTrips", {
                            count: data.recommended.totalTrips,
                          })}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <div>
                          <p className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Clock3 className="h-3.5 w-3.5" />
                            {t("recommended.nextTrip")}
                          </p>
                          <p className="mt-1 font-semibold text-4xl tabular-nums">
                            {data.recommended.nextTrip?.departureTime ?? "—"}
                          </p>
                          <p className="mt-1 text-primary text-sm">
                            {formatMinutes(
                              data.recommended.nextTrip
                                ?.minutesUntilDeparture ?? null,
                            ) ?? t("recommended.noUpcoming")}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-muted/40 px-4 py-3 text-right">
                          <p className="text-muted-foreground text-xs">
                            {t("recommended.arrive")}
                          </p>
                          <p className="font-medium text-lg tabular-nums">
                            {data.recommended.nextTrip?.arrivalTime ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">
                          {t("upcomingTrips")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t("route.upcomingTrips", {
                            count: data.recommended.upcomingTrips.length,
                          })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {data.recommended.visibleTrips
                          .slice(0, compact ? 2 : 3)
                          .map((trip) => (
                            <div
                              key={trip.id}
                              className="rounded-2xl border border-border bg-background px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm tabular-nums">
                                    {trip.departureTime ?? "—"} {"->"}{" "}
                                    {trip.arrivalTime ?? "—"}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                    {trip.stopTimes
                                      .map((stopTime) =>
                                        stopTime.time
                                          ? `${stopTime.campusName} ${stopTime.time}`
                                          : `${stopTime.campusName} ${t("passThrough")}`,
                                      )
                                      .join(" / ")}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    trip.status === "upcoming"
                                      ? "success"
                                      : "outline"
                                  }
                                  size="sm"
                                >
                                  {trip.status === "upcoming"
                                    ? formatMinutes(trip.minutesUntilDeparture)
                                    : t("departed")}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border border-dashed bg-background px-6 py-10 text-center text-muted-foreground text-sm">
                    {t("recommended.noUpcoming")}
                  </div>
                )}
              </div>

              {!compact && alternativeMatches.length > 0 ? (
                <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-base">
                      {t("allRoutes.title")}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {t("allRoutes.description")}
                  </p>
                  <div className="space-y-3">
                    {alternativeMatches.map((match) => (
                      <div
                        key={`alternative-${match.route.id}`}
                        className="rounded-2xl border border-border/80 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">
                              {match.route.descriptionPrimary}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {match.nextTrip?.departureTime
                                ? `${t("nextDeparture")}: ${match.nextTrip.departureTime}`
                                : t("noMoreBusToday")}
                            </p>
                          </div>
                          <Badge variant="outline" size="sm">
                            {match.upcomingTrips.length > 0
                              ? t("route.upcomingTrips", {
                                  count: match.upcomingTrips.length,
                                })
                              : t("recommended.departed")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {shouldShowAllRoutes ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base">
                      {t("allRoutes.title")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("allRoutes.description")}
                    </p>
                  </div>
                  <Badge variant="outline" size="sm">
                    {t("route.totalTrips", { count: data.matches.length })}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {(compact ? data.matches.slice(0, 6) : data.matches).map(
                    (match) => (
                      <details
                        key={`all-${match.route.id}`}
                        className="group overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
                      >
                        <summary className="cursor-pointer list-none px-4 py-4 transition-colors hover:bg-accent/30">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                              <div>
                                <p className="font-medium">
                                  {match.route.descriptionPrimary}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {match.nextTrip?.departureTime
                                    ? `${t("nextDeparture")}: ${match.nextTrip.departureTime}`
                                    : t("noMoreBusToday")}
                                </p>
                              </div>
                            </div>

                            <div className="text-right text-xs">
                              <p className="text-muted-foreground">
                                {t("route.totalTrips", {
                                  count: match.totalTrips,
                                })}
                              </p>
                              <p>
                                {match.upcomingTrips.length > 0
                                  ? t("route.upcomingTrips", {
                                      count: match.upcomingTrips.length,
                                    })
                                  : t("recommended.departed")}
                              </p>
                            </div>
                          </div>
                        </summary>

                        <div className="border-border/70 border-t bg-muted/10 px-4 py-4">
                          <div className="space-y-2">
                            {match.allTrips.map((trip) => (
                              <div
                                key={`trip-${trip.id}`}
                                className="rounded-xl border border-border/70 bg-background px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm tabular-nums">
                                      {trip.departureTime ?? "—"} {"->"}{" "}
                                      {trip.arrivalTime ?? "—"}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                      {trip.stopTimes
                                        .map((stopTime) =>
                                          stopTime.time
                                            ? `${stopTime.campusName} ${stopTime.time}`
                                            : `${stopTime.campusName} ${t("passThrough")}`,
                                        )
                                        .join(" / ")}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      trip.status === "upcoming"
                                        ? "success"
                                        : "outline"
                                    }
                                    size="sm"
                                  >
                                    {trip.status === "upcoming"
                                      ? formatMinutes(
                                          trip.minutesUntilDeparture,
                                        )
                                      : t("departed")}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    ),
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
