"use client";

import { type ReactNode, useMemo } from "react";
import type { BusApplicableRoute } from "@/features/bus/lib/bus-client";
import { cn } from "@/shared/lib/utils";
import {
  BUS_ROUTE_TABLE_SHELL_CLASS,
  type BusTranslator,
  formatEtaHoursMinutes,
  formatStopTime,
  getNextUpcomingTripHighlightKey,
  getRouteSegmentStopColumns,
  getTripStopTimeForOrder,
} from "./bus-panel-shared";

export function BusRouteTable({
  actions,
  footer,
  routes,
  t,
}: {
  actions?: ReactNode;
  footer?: ReactNode;
  routes: BusApplicableRoute[];
  t: BusTranslator;
}) {
  const nextTripHighlightKey = useMemo(
    () => getNextUpcomingTripHighlightKey(routes),
    [routes],
  );

  return (
    <div className={BUS_ROUTE_TABLE_SHELL_CLASS}>
      <div className="relative w-full" data-slot="table-container">
        <div
          className="flex flex-wrap items-center justify-end gap-2 border-border/50 border-b bg-muted/10 px-3 py-2.5 sm:px-4"
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
                  className="min-w-0 rounded-2xl border border-border/50 bg-background/55"
                >
                  <header className="flex flex-col gap-3 border-border/50 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-2">
                      <h3 className="font-medium text-foreground text-sm leading-snug tracking-tight">
                        {route.route.descriptionPrimary}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {t("route.totalTrips", { count: route.totalTrips })}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl border border-border/50 bg-muted/10 px-3 py-2 text-left sm:min-w-[8.5rem] sm:text-right">
                      <p className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide">
                        {t("nextDeparture")}
                      </p>
                      <p className="mt-1 font-medium text-foreground text-sm">
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
                      <caption className="sr-only">
                        {route.route.descriptionPrimary}
                      </caption>
                      <thead>
                        <tr className="border-border/50 border-b bg-muted/15">
                          {stopColumns.map((col) => (
                            <th
                              key={`${route.route.id}-col-${col.stopOrder}`}
                              className="h-auto min-w-[4.25rem] max-w-[7rem] px-3 py-2.5 text-left align-bottom font-medium text-muted-foreground text-xs leading-tight sm:px-4"
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
                                "border-border/40 border-b transition-colors last:border-b-0 odd:bg-background even:bg-muted/[0.06] hover:bg-muted/20",
                                trip.status === "departed" &&
                                  "bg-muted/5 text-muted-foreground",
                                isNextHighlight &&
                                  "bg-primary/6 ring-1 ring-primary/20 ring-inset hover:bg-primary/8",
                              )}
                            >
                              {stopColumns.map((col, index) => {
                                const stopTime = getTripStopTimeForOrder(
                                  trip,
                                  col.stopOrder,
                                );
                                return (
                                  <td
                                    key={`${trip.trip.id}-stop-${col.stopOrder}`}
                                    className={cn(
                                      "px-3 py-3 align-middle sm:px-4",
                                      index === 0 && "ps-4 sm:ps-5",
                                      index === stopColumns.length - 1 &&
                                        "pe-4 sm:pe-5",
                                    )}
                                  >
                                    <p
                                      className={cn(
                                        "font-mono text-sm tabular-nums tracking-tight sm:text-[0.9375rem]",
                                        trip.status === "departed"
                                          ? "text-muted-foreground"
                                          : "text-foreground",
                                        stopTime.isEstimated &&
                                          trip.status !== "departed" &&
                                          "text-foreground/80",
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
