"use client";

import { ArrowLeftRight, Eye, EyeOff, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import {
  type BusApplicableRoute,
  type BusApplicableTrip,
  type BusComputedStopTime,
  getApplicableBusRoutes,
  getDefaultBusSelection,
  resolveClientBusDayType,
} from "@/features/bus/lib/bus-client";
import type { BusTimetableData } from "@/features/bus/lib/bus-types";
import { extractApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/shared/lib/utils";

const AUTO_SAVE_DELAY_MS = 600;

/** Planner timetable wrapper: flat layout (no outer card chrome). */
const BUS_ROUTE_TABLE_SHELL_CLASS = "min-w-0 flex flex-col";

/** Next-departure summary: wall-clock style "X h Y min" (locale via messages). */
function formatEtaHoursMinutes(
  minutes: number | null,
  t: (key: string, values?: Record<string, number | string>) => string,
): string | null {
  if (minutes == null) return null;
  if (minutes <= 0) return t("planner.departEtaMinutes", { count: 0 });

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return t("planner.departEtaMinutes", { count: rest });
  }
  if (rest === 0) {
    return t("planner.departEtaHours", { count: hours });
  }
  return t("planner.departEtaHoursMinutes", { hours, minutes: rest });
}

function formatStopTime(stopTime: BusComputedStopTime): string {
  if (!stopTime.displayTime) return "—";
  return stopTime.isEstimated
    ? `~${stopTime.displayTime}`
    : stopTime.displayTime;
}

function PlannerDayTypePills({
  value,
  onChange,
  t,
}: {
  value: "weekday" | "weekend";
  onChange: (value: "weekday" | "weekend") => void;
  t: (key: string) => string;
}) {
  return (
    <DashboardTabToolbarGroup className="rounded-xl border-border/70 bg-background p-1">
      {(["weekday", "weekend"] as const).map((dayType) => (
        <button
          key={dayType}
          type="button"
          aria-pressed={value === dayType}
          onClick={() => onChange(dayType)}
          className={dashboardTabToolbarItemClass(
            value === dayType,
            "min-h-9 rounded-lg px-3 font-medium text-sm",
          )}
        >
          {t(`dayType.${dayType}`)}
        </button>
      ))}
    </DashboardTabToolbarGroup>
  );
}

function StopPicker({
  testId,
  label,
  campuses,
  selectedId,
  onSelect,
}: {
  testId: string;
  label: string;
  campuses: BusTimetableData["campuses"];
  selectedId: number | null;
  onSelect: (campusId: number) => void;
}) {
  return (
    <section className="space-y-2">
      <p className="text-foreground text-sm">{label}</p>
      <fieldset data-testid={testId} className="space-y-2">
        <legend className="sr-only">{label}</legend>
        {campuses.map((campus) => {
          const isSelected = selectedId === campus.id;
          return (
            <button
              key={campus.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(campus.id)}
              className={cn(
                "flex min-h-10 w-full touch-manipulation items-center rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 bg-background text-foreground hover:border-foreground/25 hover:bg-muted/30",
              )}
            >
              <span className="truncate text-sm">{campus.namePrimary}</span>
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}

/** Stops between user-selected origin and destination (inclusive), table column order. */
function getRouteSegmentStopColumns(route: BusApplicableRoute): {
  label: string;
  stopOrder: number;
}[] {
  const stops = route.route.stops;
  const startIdx = stops.findIndex(
    (s) => s.stopOrder === route.startStop.stopOrder,
  );
  const endIdx = stops.findIndex(
    (s) => s.stopOrder === route.endStop.stopOrder,
  );
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return [];

  const columns: { label: string; stopOrder: number }[] = [];
  for (let i = startIdx; i <= endIdx; i += 1) {
    columns.push({
      label: stops[i].campus.namePrimary,
      stopOrder: stops[i].stopOrder,
    });
  }
  return columns;
}

function getTripStopTimeForOrder(
  trip: BusApplicableTrip,
  stopOrder: number,
): BusComputedStopTime {
  return (
    trip.stopTimes.find((st) => st.stopOrder === stopOrder) ?? trip.startTime
  );
}

/** Earliest upcoming trip across all visible rows (same ordering intent as route list). */
function getNextUpcomingTripHighlightKey(
  routes: BusApplicableRoute[],
): string | null {
  let bestMinutes = Number.POSITIVE_INFINITY;
  let bestKey: string | null = null;
  for (const route of routes) {
    for (const trip of route.visibleTrips) {
      if (trip.status !== "upcoming") continue;
      const m = trip.startTime.displayMinutes;
      if (m == null) continue;
      if (m < bestMinutes) {
        bestMinutes = m;
        bestKey = `${route.route.id}:${trip.trip.id}`;
      }
    }
  }
  return bestKey;
}

function CombinedRouteTable({
  routes,
  t,
  footer,
  actions,
}: {
  routes: BusApplicableRoute[];
  t: (key: string, values?: Record<string, number | string>) => string;
  footer?: ReactNode;
  actions?: ReactNode;
}) {
  const nextTripHighlightKey = useMemo(
    () => getNextUpcomingTripHighlightKey(routes),
    [routes],
  );

  return (
    <div className={BUS_ROUTE_TABLE_SHELL_CLASS}>
      <div className="relative w-full" data-slot="table-container">
        <div
          className="flex flex-wrap items-center justify-end gap-2 border-border/50 border-b px-3 py-2.5 sm:px-4"
          data-slot="bus-table-actions"
        >
          {actions}
        </div>

        {routes.length === 0 ? (
          <div className="px-3 py-8 sm:px-4">
            <p className="rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 py-10 text-center text-muted-foreground text-sm">
              {t("planner.empty")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-3 py-2 sm:px-4 sm:py-3">
            {routes.map((route) => {
              const stopColumns = getRouteSegmentStopColumns(route);
              const tableMinWidth = `${Math.max(16, stopColumns.length * 4.25)}rem`;

              return (
                <section
                  key={`route-card-${route.route.id}`}
                  className="min-w-0"
                >
                  <header className="flex flex-col gap-2 border-border/50 border-b px-0 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-2">
                      <h3 className="text-foreground text-sm leading-snug tracking-tight">
                        {route.route.descriptionPrimary}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {t("route.totalTrips", { count: route.totalTrips })}
                      </p>
                    </div>
                    <div className="shrink-0 text-end sm:pt-0.5">
                      <p className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide">
                        {t("nextDeparture")}
                      </p>
                      <p className="mt-0.5 text-foreground text-sm">
                        {route.nextTrip
                          ? (formatEtaHoursMinutes(
                              route.nextTrip.minutesUntilStart,
                              t,
                            ) ?? t("planner.etaUnknown"))
                          : t("noMoreBusToday")}
                      </p>
                    </div>
                  </header>

                  <div className="overflow-x-auto">
                    <table
                      className="w-full caption-bottom border-separate border-spacing-0 text-sm"
                      style={{ minWidth: tableMinWidth }}
                    >
                      <thead>
                        <tr className="border-border/50 border-b bg-muted/15">
                          {stopColumns.map((col) => (
                            <th
                              key={`${route.route.id}-col-${col.stopOrder}`}
                              className="h-auto min-w-[4.25rem] max-w-[7rem] px-2 py-2 text-left align-bottom font-normal text-muted-foreground text-xs leading-tight sm:px-3"
                              scope="col"
                            >
                              <span className="line-clamp-3">{col.label}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {route.visibleTrips.map((trip) => {
                          const tripKey = `${route.route.id}:${trip.trip.id}`;
                          const isNextHighlight =
                            nextTripHighlightKey != null &&
                            tripKey === nextTripHighlightKey;

                          return (
                            <tr
                              key={`trip-${route.route.id}-${trip.trip.id}`}
                              className={cn(
                                "border-border/40 border-b transition-colors last:border-b-0 hover:bg-muted/20",
                                trip.status === "departed" &&
                                  "bg-muted/5 text-muted-foreground",
                                isNextHighlight &&
                                  "bg-primary/6 ring-1 ring-primary/20 ring-inset hover:bg-primary/8",
                              )}
                            >
                              {stopColumns.map((col) => {
                                const stopTime = getTripStopTimeForOrder(
                                  trip,
                                  col.stopOrder,
                                );
                                return (
                                  <td
                                    key={`${trip.trip.id}-stop-${col.stopOrder}`}
                                    className="px-2 py-2.5 align-middle sm:px-3 sm:py-3"
                                  >
                                    <p
                                      className={cn(
                                        "font-mono text-sm tabular-nums tracking-tight sm:text-[0.9375rem]",
                                        trip.status === "departed"
                                          ? "text-muted-foreground"
                                          : "text-foreground",
                                      )}
                                    >
                                      {formatStopTime(stopTime)}
                                    </p>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      {footer ? (
        <div className="flex flex-col gap-2 border-border/50 border-t bg-muted/10 px-4 py-3 sm:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type BusPanelProps = {
  data: BusTimetableData;
  signedIn?: boolean;
  showPreferences?: boolean;
  className?: string;
};

export function BusPanel({
  data,
  signedIn = false,
  showPreferences = false,
  className,
}: BusPanelProps) {
  const t = useTranslations("bus");
  const [, startTransition] = useTransition();
  const defaultSelection = useMemo(
    () => getDefaultBusSelection(data, data.preferences),
    [data],
  );

  const [selectedDayType, setSelectedDayType] = useState<"weekday" | "weekend">(
    "weekday",
  );
  const [startCampusId, setStartCampusId] = useState<number | null>(
    defaultSelection.startCampusId,
  );
  const [endCampusId, setEndCampusId] = useState<number | null>(
    defaultSelection.endCampusId,
  );
  const [showDepartedTrips, setShowDepartedTrips] = useState(
    data.preferences?.showDepartedTrips ?? false,
  );
  const [now, setNow] = useState(() => new Date());
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedDayType(resolveClientBusDayType(new Date()));
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const applicableRoutes = useMemo(
    () =>
      getApplicableBusRoutes({
        data,
        dayType: selectedDayType,
        startCampusId,
        endCampusId,
        showDepartedTrips,
        now,
      }),
    [data, selectedDayType, startCampusId, endCampusId, showDepartedTrips, now],
  );

  /** Show "~" legend when visible rows use estimates, or when raw timetable can still show them after changing filters (empty applicable list). */
  const showPlannerEstimatedHint = useMemo(() => {
    const inVisibleRows = applicableRoutes.some((route) =>
      route.visibleTrips.some((trip) =>
        trip.stopTimes.some((stopTime) => stopTime.isEstimated),
      ),
    );
    if (inVisibleRows) return true;
    return data.trips.some(
      (trip) =>
        trip.dayType === selectedDayType &&
        trip.stopTimes.some((st) => st.time == null),
    );
  }, [applicableRoutes, data.trips, selectedDayType]);

  const savePreference = useCallback(
    (
      nextStartCampusId: number | null,
      nextEndCampusId: number | null,
      nextShowDepartedTrips: boolean,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSaveState("saving");
      setSaveError(null);

      startTransition(async () => {
        try {
          const response = await fetch("/api/bus/preferences", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              preferredOriginCampusId: nextStartCampusId,
              preferredDestinationCampusId: nextEndCampusId,
              showDepartedTrips: nextShowDepartedTrips,
            }),
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          let body: unknown = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }

          if (!response.ok) {
            setSaveState("error");
            setSaveError(
              extractApiErrorMessage(body) ?? t("preferences.saveFailed"),
            );
            return;
          }

          setSaveState("saved");
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          setSaveState("error");
          setSaveError(t("preferences.saveFailed"));
        }
      });
    },
    [t],
  );

  useEffect(() => {
    if (!signedIn || !showPreferences || !dirtyRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      savePreference(startCampusId, endCampusId, showDepartedTrips);
      dirtyRef.current = false;
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    endCampusId,
    savePreference,
    showDepartedTrips,
    showPreferences,
    signedIn,
    startCampusId,
  ]);

  const markDirty = useCallback(() => {
    if (!signedIn || !showPreferences) return;
    dirtyRef.current = true;
    setSaveState("idle");
    setSaveError(null);
  }, [showPreferences, signedIn]);

  const handleSwap = useCallback(() => {
    markDirty();
    setStartCampusId(endCampusId);
    setEndCampusId(startCampusId);
  }, [endCampusId, markDirty, startCampusId]);

  const plannerMeta =
    saveState === "saving"
      ? t("preferences.saving")
      : saveState === "saved"
        ? t("preferences.saved")
        : saveState === "error"
          ? (saveError ?? t("preferences.saveFailed"))
          : showPreferences && signedIn
            ? t("preferences.autosaveHint")
            : t("planner.clientHint");

  const plannerActions = (
    <>
      <Link
        href="/bus-map"
        className={cn(
          dashboardTabToolbarItemClass(
            false,
            "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border/70 bg-background px-3 font-medium text-sm",
          ),
        )}
      >
        <MapIcon aria-hidden="true" className="h-4 w-4" />
        <span>{t("transitMap")}</span>
      </Link>

      <button
        type="button"
        onClick={() => {
          markDirty();
          setShowDepartedTrips((value) => !value);
        }}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          showDepartedTrips
            ? "border-foreground bg-foreground text-background"
            : "border-border/70 bg-background text-foreground hover:bg-muted/30",
        )}
        aria-pressed={showDepartedTrips}
        aria-label={t("query.showDepartedTrips")}
      >
        {showDepartedTrips ? (
          <Eye aria-hidden="true" className="h-4 w-4" />
        ) : (
          <EyeOff aria-hidden="true" className="h-4 w-4" />
        )}
        <span>{t("query.showDepartedTrips")}</span>
      </button>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
        className,
      )}
    >
      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5 border-border/50 border-b pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PlannerDayTypePills
                value={selectedDayType}
                onChange={setSelectedDayType}
                t={t}
              />
            </div>
          </div>

          <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
            <StopPicker
              testId="bus-start-stop-group"
              label={t("planner.start")}
              campuses={data.campuses}
              selectedId={startCampusId}
              onSelect={(campusId) => {
                markDirty();
                if (endCampusId != null && campusId === endCampusId) {
                  setEndCampusId(startCampusId);
                  setStartCampusId(campusId);
                } else {
                  setStartCampusId(campusId);
                }
              }}
            />

            <div className="hidden lg:flex lg:items-start lg:justify-center lg:pt-9">
              <button
                type="button"
                onClick={handleSwap}
                className={cn(
                  dashboardTabToolbarItemClass(
                    false,
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  ),
                )}
                aria-label={t("planner.reverse")}
              >
                <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <StopPicker
              testId="bus-end-stop-group"
              label={t("planner.end")}
              campuses={data.campuses}
              selectedId={endCampusId}
              onSelect={(campusId) => {
                markDirty();
                if (startCampusId != null && campusId === startCampusId) {
                  setStartCampusId(endCampusId);
                  setEndCampusId(campusId);
                } else {
                  setEndCampusId(campusId);
                }
              }}
            />
          </div>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:min-w-0 lg:flex-1">
        {signedIn && showPreferences ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
            <p
              aria-live="polite"
              className={cn(
                "text-xs",
                saveState === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {plannerMeta}
            </p>
          </div>
        ) : null}

        <CombinedRouteTable
          routes={applicableRoutes}
          t={t}
          actions={plannerActions}
          footer={
            data.notice?.message || showPlannerEstimatedHint ? (
              <>
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
                {showPlannerEstimatedHint ? (
                  <p className="text-muted-foreground text-xs">
                    {t("planner.estimatedHint")}
                  </p>
                ) : null}
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
