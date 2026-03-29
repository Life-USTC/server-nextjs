"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BusDayType } from "@/generated/prisma/client";

type StopData = {
  id: number;
  externalId: number;
  name: string;
  latitude: number;
  longitude: number;
};

type RouteStopData = {
  id: number;
  stopOrder: number;
  stop: StopData;
};

type TripData = {
  id: number;
  dayType: BusDayType;
  times: (string | null)[];
};

type RouteData = {
  id: number;
  routeNumber: number;
  stops: RouteStopData[];
  trips: TripData[];
};

type ScheduleConfigData = {
  id: number;
  name: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  sourceMessage: string | null;
  sourceUrl: string | null;
  stops: StopData[];
  routes: RouteData[];
};

export function BusScheduleView({ config }: { config: ScheduleConfigData }) {
  const t = useTranslations("busSchedule");
  const [dayType, setDayType] = useState<BusDayType>("weekday");
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);

  const filteredRoutes = config.routes
    .map((route) => ({
      ...route,
      trips: route.trips.filter((trip) => trip.dayType === dayType),
    }))
    .filter((route) => route.trips.length > 0)
    .filter(
      (route) =>
        selectedStopId === null ||
        route.stops.some((rs) => rs.stop.id === selectedStopId),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${
              dayType === "weekday"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setDayType("weekday")}
          >
            {t("weekday")}
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 font-medium text-sm transition-colors ${
              dayType === "weekend"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setDayType("weekend")}
          >
            {t("weekend")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
              selectedStopId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setSelectedStopId(null)}
          >
            {t("allStops")}
          </button>
          {config.stops.map((stop) => (
            <button
              key={stop.id}
              type="button"
              className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                selectedStopId === stop.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => setSelectedStopId(stop.id)}
            >
              {stop.name}
            </button>
          ))}
        </div>
      </div>

      {config.sourceMessage ? (
        <p className="text-muted-foreground text-sm">
          {config.sourceUrl ? (
            <a
              href={config.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {config.sourceMessage}
            </a>
          ) : (
            config.sourceMessage
          )}
        </p>
      ) : null}

      {filteredRoutes.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("noRoutes")}
        </p>
      ) : (
        <div className="space-y-8">
          {filteredRoutes.map((route) => (
            <RouteTable key={route.id} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}

function RouteTable({ route }: { route: RouteData }) {
  const t = useTranslations("busSchedule");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
        <Badge variant="outline" className="font-mono">
          {t("routeNumber", { number: route.routeNumber })}
        </Badge>
        <span className="font-medium text-sm">
          {route.stops.map((rs) => rs.stop.name).join(" → ")}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {route.stops.map((rs) => (
              <TableHead key={rs.id}>{rs.stop.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {route.trips.map((trip) => {
            const times = trip.times as (string | null)[];
            return (
              <TableRow key={trip.id}>
                {route.stops.map((rs, index) => (
                  <TableCell
                    key={`${trip.id}-${rs.id}`}
                    className="font-mono tabular-nums"
                  >
                    {times[index] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
