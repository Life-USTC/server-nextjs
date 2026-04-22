"use client";

import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import type {
  BusRouteStopSummary,
  BusRouteSummary,
  BusTimetableData,
  BusTripStatus,
  BusTripStopTime,
  BusTripSummary,
  BusUserPreferenceSummary,
} from "./bus-types";

export type BusComputedStopTime = BusTripStopTime & {
  displayTime: string | null;
  displayMinutes: number | null;
  isEstimated: boolean;
};

export type BusApplicableTrip = {
  trip: BusTripSummary;
  route: BusRouteSummary;
  stopTimes: BusComputedStopTime[];
  startStop: BusRouteStopSummary;
  endStop: BusRouteStopSummary;
  startTime: BusComputedStopTime;
  endTime: BusComputedStopTime;
  status: BusTripStatus;
  minutesUntilStart: number | null;
};

export type BusApplicableRoute = {
  route: BusRouteSummary;
  startStop: BusRouteStopSummary;
  endStop: BusRouteStopSummary;
  nextTrip: BusApplicableTrip | null;
  upcomingTrips: BusApplicableTrip[];
  visibleTrips: BusApplicableTrip[];
  allTrips: BusApplicableTrip[];
  totalTrips: number;
};

function formatMinutesAsTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function estimateStopMinutes(
  stopTimes: BusTripStopTime[],
  stopIndex: number,
): { minutes: number | null; isEstimated: boolean } {
  const exact = stopTimes[stopIndex]?.minutesSinceMidnight ?? null;
  if (exact != null) {
    return { minutes: exact, isEstimated: false };
  }

  let previous: number | null = null;
  for (let index = stopIndex - 1; index >= 0; index -= 1) {
    const minutes = stopTimes[index]?.minutesSinceMidnight ?? null;
    if (minutes != null) {
      previous = minutes;
      break;
    }
  }

  let next: number | null = null;
  for (let index = stopIndex + 1; index < stopTimes.length; index += 1) {
    const minutes = stopTimes[index]?.minutesSinceMidnight ?? null;
    if (minutes != null) {
      next = minutes;
      break;
    }
  }

  if (previous != null && next != null) {
    return {
      minutes: Math.round((previous + next) / 2),
      isEstimated: true,
    };
  }

  if (previous != null || next != null) {
    return {
      minutes: previous ?? next,
      isEstimated: true,
    };
  }

  return { minutes: null, isEstimated: false };
}

function buildComputedStopTime(
  stopTimes: BusTripStopTime[],
  stopIndex: number,
): BusComputedStopTime {
  const stopTime = stopTimes[stopIndex];
  const estimated = estimateStopMinutes(stopTimes, stopIndex);
  const displayMinutes = estimated.minutes;
  const displayTime =
    stopTime?.time ??
    (displayMinutes != null ? formatMinutesAsTime(displayMinutes) : null);

  return {
    ...stopTime,
    displayTime,
    displayMinutes,
    isEstimated: estimated.isEstimated,
  };
}

function hasRouteBetweenStops(
  route: BusRouteSummary,
  startCampusId: number | null,
  endCampusId: number | null,
) {
  if (
    startCampusId == null ||
    endCampusId == null ||
    startCampusId === endCampusId
  ) {
    return false;
  }

  const startStop = route.stops.find(
    (stop) => stop.campus.id === startCampusId,
  );
  const endStop = route.stops.find((stop) => stop.campus.id === endCampusId);

  return Boolean(
    startStop && endStop && startStop.stopOrder < endStop.stopOrder,
  );
}

export function resolveClientBusDayType(
  now = new Date(),
): "weekday" | "weekend" {
  const day = now.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getShanghaiMinutesSinceMidnight(now: Date | string): number {
  const shanghaiNow = shanghaiDayjs(now);
  return shanghaiNow.hour() * 60 + shanghaiNow.minute();
}

export function getDefaultBusSelection(
  data: BusTimetableData,
  preference: BusUserPreferenceSummary | null,
): {
  startCampusId: number | null;
  endCampusId: number | null;
} {
  if (
    preference?.preferredOriginCampusId != null &&
    preference?.preferredDestinationCampusId != null &&
    data.routes.some((route) =>
      hasRouteBetweenStops(
        route,
        preference.preferredOriginCampusId,
        preference.preferredDestinationCampusId,
      ),
    )
  ) {
    return {
      startCampusId: preference.preferredOriginCampusId,
      endCampusId: preference.preferredDestinationCampusId,
    };
  }

  const firstUsableRoute = data.routes.find((route) => route.stops.length >= 2);
  if (firstUsableRoute) {
    return {
      startCampusId: firstUsableRoute.stops[0]?.campus.id ?? null,
      endCampusId:
        firstUsableRoute.stops[firstUsableRoute.stops.length - 1]?.campus.id ??
        null,
    };
  }

  return {
    startCampusId: data.campuses[0]?.id ?? null,
    endCampusId: data.campuses[1]?.id ?? null,
  };
}

export function getApplicableBusRoutes(input: {
  data: BusTimetableData;
  dayType: "weekday" | "weekend";
  startCampusId: number | null;
  endCampusId: number | null;
  showDepartedTrips: boolean;
  now: Date;
}): BusApplicableRoute[] {
  const { data, dayType, startCampusId, endCampusId, showDepartedTrips, now } =
    input;
  const nowMinutes = getShanghaiMinutesSinceMidnight(now);

  return data.routes
    .flatMap<BusApplicableRoute>((route) => {
      const startStop = route.stops.find(
        (stop) => stop.campus.id === startCampusId,
      );
      const endStop = route.stops.find(
        (stop) => stop.campus.id === endCampusId,
      );

      if (!startStop || !endStop || startStop.stopOrder >= endStop.stopOrder) {
        return [];
      }

      const startIndex = route.stops.findIndex(
        (stop) => stop.stopOrder === startStop.stopOrder,
      );
      const endIndex = route.stops.findIndex(
        (stop) => stop.stopOrder === endStop.stopOrder,
      );

      const allTrips = data.trips
        .filter((trip) => trip.routeId === route.id && trip.dayType === dayType)
        .map<BusApplicableTrip>((trip) => {
          const stopTimes = trip.stopTimes.map((_, index) =>
            buildComputedStopTime(trip.stopTimes, index),
          );
          const startTime = stopTimes[startIndex];
          const endTime = stopTimes[endIndex];
          const status =
            startTime.displayMinutes == null ||
            startTime.displayMinutes >= nowMinutes
              ? "upcoming"
              : "departed";

          return {
            trip,
            route,
            stopTimes,
            startStop,
            endStop,
            startTime,
            endTime,
            status,
            minutesUntilStart:
              startTime.displayMinutes == null
                ? null
                : startTime.displayMinutes - nowMinutes,
          };
        })
        .sort((left, right) => {
          const leftMinutes =
            left.startTime.displayMinutes ?? Number.MAX_SAFE_INTEGER;
          const rightMinutes =
            right.startTime.displayMinutes ?? Number.MAX_SAFE_INTEGER;

          if (leftMinutes !== rightMinutes) {
            return leftMinutes - rightMinutes;
          }

          return left.trip.position - right.trip.position;
        });

      const upcomingTrips = allTrips.filter(
        (trip) => trip.status === "upcoming",
      );

      return [
        {
          route,
          startStop,
          endStop,
          nextTrip: upcomingTrips[0] ?? null,
          upcomingTrips,
          visibleTrips: showDepartedTrips ? allTrips : upcomingTrips,
          allTrips,
          totalTrips: allTrips.length,
        },
      ];
    })
    .sort((left, right) => {
      const leftMinutes =
        left.nextTrip?.startTime.displayMinutes ?? Number.MAX_SAFE_INTEGER;
      const rightMinutes =
        right.nextTrip?.startTime.displayMinutes ?? Number.MAX_SAFE_INTEGER;

      if (leftMinutes !== rightMinutes) {
        return leftMinutes - rightMinutes;
      }

      return left.route.id - right.route.id;
    });
}
