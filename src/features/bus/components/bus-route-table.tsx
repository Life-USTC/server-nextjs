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
