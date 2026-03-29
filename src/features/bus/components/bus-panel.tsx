"use client";

import { Bus, Clock3, Settings2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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

  const recommendedCards = useMemo(
    () =>
      data.recommended
        ? [
            data.recommended,
            ...data.matches.filter(
              (item) => item.route.id !== data.recommended?.route.id,
            ),
          ].slice(0, 3)
        : data.matches.slice(0, 3),
    [data.matches, data.recommended],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">{t("title")}</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", {
              dayType:
                data.todayType === "weekday" ? t("weekday") : t("weekend"),
            })}
          </p>
          {data.notice?.message ? (
            <p className="text-muted-foreground text-xs">
              {data.notice.url ? (
                <a
                  href={data.notice.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
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
          <span className="rounded-full border border-border px-3 py-1 text-muted-foreground text-xs">
            {t("activeVersion")}: {data.version?.title ?? "—"}
          </span>
          {showPreferences ? (
            <button
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Settings2 className="h-4 w-4" />
              {showSettings ? t("hidePreferences") : t("editPreferences")}
            </button>
          ) : null}
        </div>
      </div>

      {showSettings && showPreferences ? (
        <BusPreferenceForm
          campuses={data.campuses}
          preference={initialPreference ?? data.preferences}
          signedIn={signedIn}
        />
      ) : null}

      {data.matches.length === 0 ? (
        <div className="rounded-2xl border border-border border-dashed px-6 py-10 text-center text-muted-foreground text-sm">
          {t("empty")}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <h3 className="font-medium">{t("recommended.title")}</h3>
            </div>
            <div
              className={cn(
                "grid gap-4",
                compact ? "lg:grid-cols-2" : "lg:grid-cols-3",
              )}
            >
              {recommendedCards.map((match) => (
                <div
                  key={`recommended-${match.route.id}`}
                  className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {match.route.descriptionPrimary}
                      </p>
                      {data.recommended?.route.id === match.route.id ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                          {t("bestMatch")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {match.route.descriptionSecondary ??
                        `${match.originStop.campus.namePrimary} -> ${match.destinationStop.campus.namePrimary}`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted/40 px-4 py-3">
                    {match.nextTrip ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{t("nextDeparture")}</span>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="font-semibold text-2xl tabular-nums">
                              {match.nextTrip.departureTime ?? "—"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatMinutes(
                                match.nextTrip.minutesUntilDeparture,
                              ) ?? t("noTime")}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-muted-foreground">
                              {t("arriveAt")}
                            </p>
                            <p className="font-medium tabular-nums">
                              {match.nextTrip.arrivalTime ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium">{t("noMoreBusToday")}</p>
                        <p className="text-muted-foreground text-xs">
                          {t("switchVersionHint")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-sm">{t("upcomingTrips")}</p>
                    <div className="space-y-2">
                      {match.visibleTrips.slice(0, 4).map((trip) => (
                        <div
                          key={trip.id}
                          className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-sm tabular-nums">
                              {trip.departureTime ?? "—"} {"->"}{" "}
                              {trip.arrivalTime ?? "—"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {trip.stopTimes
                                .map((stopTime) =>
                                  stopTime.time
                                    ? `${stopTime.campusName} ${stopTime.time}`
                                    : `${stopTime.campusName} ${t("passThrough")}`,
                                )
                                .join(" / ")}
                            </p>
                          </div>
                          {trip.status === "upcoming" ? (
                            <span className="text-primary text-xs">
                              {formatMinutes(trip.minutesUntilDeparture)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {t("departed")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-medium">{t("allRoutes.title")}</h3>
            <div className="space-y-3">
              {(compact ? data.matches.slice(0, 6) : data.matches).map(
                (match) => (
                  <details
                    key={`all-${match.route.id}`}
                    className="rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
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
                        <div className="text-right text-xs">
                          <p className="text-muted-foreground">
                            {t("route.totalTrips", { count: match.totalTrips })}
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

                    <div className="mt-4 space-y-2">
                      {match.allTrips.map((trip) => (
                        <div
                          key={`trip-${trip.id}`}
                          className="rounded-lg border border-border/80 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-sm tabular-nums">
                              {trip.departureTime ?? "—"} {"->"}{" "}
                              {trip.arrivalTime ?? "—"}
                            </p>
                            <span
                              className={cn(
                                "text-xs",
                                trip.status === "upcoming"
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {trip.status === "upcoming"
                                ? formatMinutes(trip.minutesUntilDeparture)
                                : t("departed")}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {trip.stopTimes
                              .map((stopTime) =>
                                stopTime.time
                                  ? `${stopTime.campusName} ${stopTime.time}`
                                  : `${stopTime.campusName} ${t("passThrough")}`,
                              )
                              .join(" / ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
