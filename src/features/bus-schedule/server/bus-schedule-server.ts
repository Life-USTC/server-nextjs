import type { BusDayType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type BusScheduleData = Awaited<
  ReturnType<typeof getActiveScheduleConfig>
>;

export async function getActiveScheduleConfig(now: Date = new Date()) {
  return prisma.busScheduleConfig.findFirst({
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: {
      stops: { orderBy: { externalId: "asc" } },
      routes: {
        orderBy: { routeNumber: "asc" },
        include: {
          stops: {
            orderBy: { stopOrder: "asc" },
            include: { stop: true },
          },
          trips: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
}

export async function getAllScheduleConfigs() {
  return prisma.busScheduleConfig.findMany({
    orderBy: { effectiveFrom: "desc" },
    include: {
      stops: { orderBy: { externalId: "asc" } },
      routes: {
        orderBy: { routeNumber: "asc" },
        include: {
          stops: {
            orderBy: { stopOrder: "asc" },
            include: { stop: true },
          },
          trips: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
}

export async function getScheduleConfigById(id: number) {
  return prisma.busScheduleConfig.findUnique({
    where: { id },
    include: {
      stops: { orderBy: { externalId: "asc" } },
      routes: {
        orderBy: { routeNumber: "asc" },
        include: {
          stops: {
            orderBy: { stopOrder: "asc" },
            include: { stop: true },
          },
          trips: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
}

export type RouteWithTrips = NonNullable<BusScheduleData>["routes"][number];

export function filterRoutesByDayType(
  routes: RouteWithTrips[],
  dayType: BusDayType,
) {
  return routes
    .map((route) => ({
      ...route,
      trips: route.trips.filter((trip) => trip.dayType === dayType),
    }))
    .filter((route) => route.trips.length > 0);
}

export function filterRoutesByStop(routes: RouteWithTrips[], stopId: number) {
  return routes.filter((route) =>
    route.stops.some((rs) => rs.stopId === stopId),
  );
}
