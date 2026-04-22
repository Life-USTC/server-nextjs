import type { AppLocale } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import type {
  BusCampusSummary,
  BusDashboardSnapshot,
  BusMapActiveTrip,
  BusMapCampusNode,
  BusMapData,
  BusMapRouteEdge,
  BusPreferencePayload,
  BusResolvedDayType,
  BusRouteListing,
  BusRouteStopSummary,
  BusRouteSummary,
  BusRouteTimetable,
  BusTimetableData,
  BusTimetableInput,
  BusTripSlot,
  BusTripStopTime,
  BusTripSummary,
  BusUserPreferenceSummary,
} from "./bus-types";

type RouteRecord = {
  id: number;
  nameCn: string;
  nameEn: string | null;
  stops: BusRouteStopSummary[];
};

function hhmmToMinutes(value: string | null) {
  if (!value) return null;
  const [hourText, minuteText] = value.split(":");
  const hour = Number.parseInt(hourText ?? "", 10);
  const minute = Number.parseInt(minuteText ?? "", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function resolveBusDayType(
  inputDayType: BusResolvedDayType | undefined,
  now = shanghaiDayjs(),
): "weekday" | "weekend" {
  if (inputDayType === "weekday" || inputDayType === "weekend") {
    return inputDayType;
  }
  const day = now.day();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function toDateKey(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function isVersionEffectiveOn(
  version: { effectiveFrom: Date | null; effectiveUntil: Date | null },
  dateKey: string,
) {
  const from = toDateKey(version.effectiveFrom);
  const until = toDateKey(version.effectiveUntil);
  if (from && dateKey < from) return false;
  if (until && dateKey > until) return false;
  return true;
}

function describeRoute(
  locale: AppLocale,
  stops: BusRouteStopSummary[],
): { descriptionPrimary: string; descriptionSecondary: string | null } {
  const primaryNames = stops.map((stop) => stop.campus.namePrimary);
  const secondaryNames = stops
    .map((stop) => stop.campus.nameSecondary)
    .filter((name): name is string => Boolean(name));

  return {
    descriptionPrimary: primaryNames.join(" -> "),
    descriptionSecondary:
      locale === "en-us" && secondaryNames.length === stops.length
        ? secondaryNames.join(" -> ")
        : locale === "zh-cn" && secondaryNames.length === stops.length
          ? secondaryNames.join(" -> ")
          : null,
  };
}

function buildRouteSummary(
  locale: AppLocale,
  route: RouteRecord,
): BusRouteSummary | null {
  if (route.stops.length < 2) return null;
  const description = describeRoute(locale, route.stops);
  return {
    id: route.id,
    nameCn: route.nameCn,
    nameEn: route.nameEn,
    descriptionPrimary: description.descriptionPrimary,
    descriptionSecondary: description.descriptionSecondary,
    stops: route.stops,
  };
}

async function findEffectiveBusVersion(
  dateKey: string,
  versionKey?: string | null,
) {
  if (versionKey) {
    return prisma.busScheduleVersion.findUnique({
      where: { key: versionKey },
    });
  }

  const versions = await prisma.busScheduleVersion.findMany({
    where: { isEnabled: true },
    orderBy: [
      { effectiveFrom: "desc" },
      { importedAt: "desc" },
      { id: "desc" },
    ],
  });

  return (
    versions.find((version) => isVersionEffectiveOn(version, dateKey)) ??
    versions[0] ??
    null
  );
}

async function listBusVersions() {
  const versions = await prisma.busScheduleVersion.findMany({
    where: { isEnabled: true },
    orderBy: [
      { effectiveFrom: "desc" },
      { importedAt: "desc" },
      { id: "desc" },
    ],
  });

  return versions.map((version) => ({
    id: version.id,
    key: version.key,
    title: version.title,
    effectiveFrom: version.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: version.effectiveUntil?.toISOString() ?? null,
    importedAt: version.importedAt.toISOString(),
    notice:
      version.sourceMessage || version.sourceUrl
        ? {
            message: version.sourceMessage ?? null,
            url: version.sourceUrl ?? null,
          }
        : null,
  }));
}

async function getRouteRecords(locale: AppLocale) {
  const localizedPrisma = getPrisma(locale);
  const routes = await localizedPrisma.busRoute.findMany({
    include: {
      stops: {
        orderBy: { stopOrder: "asc" },
        include: {
          campus: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return routes.map<RouteRecord>((route) => ({
    id: route.id,
    nameCn: route.nameCn,
    nameEn: route.nameEn,
    stops: route.stops.map((stop) => ({
      stopOrder: stop.stopOrder,
      campus: {
        id: stop.campus.id,
        nameCn: stop.campus.nameCn,
        nameEn: stop.campus.nameEn,
        namePrimary: stop.campus.namePrimary,
        nameSecondary: stop.campus.nameSecondary,
        latitude: stop.campus.latitude,
        longitude: stop.campus.longitude,
      },
    })),
  }));
}

async function getBusCampuses(locale: AppLocale) {
  const localizedPrisma = getPrisma(locale);
  const campuses = await localizedPrisma.busCampus.findMany({
    orderBy: { id: "asc" },
  });

  return campuses.map<BusCampusSummary>((campus) => ({
    id: campus.id,
    nameCn: campus.nameCn,
    nameEn: campus.nameEn,
    namePrimary: campus.namePrimary,
    nameSecondary: campus.nameSecondary,
    latitude: campus.latitude,
    longitude: campus.longitude,
  }));
}

export async function getBusPreference(
  userId: string | null,
): Promise<BusUserPreferenceSummary | null> {
  if (!userId) return null;

  const preference = await prisma.busUserPreference.findUnique({
    where: { userId },
  });

  if (!preference) {
    return {
      preferredOriginCampusId: null,
      preferredDestinationCampusId: null,
      showDepartedTrips: false,
    };
  }

  return {
    preferredOriginCampusId: preference.preferredOriginCampusId,
    preferredDestinationCampusId: preference.preferredDestinationCampusId,
    showDepartedTrips: preference.showDepartedTrips,
  };
}

export async function saveBusPreference(
  userId: string,
  payload: BusPreferencePayload,
) {
  const data = {
    preferredOriginCampusId: payload.preferredOriginCampusId,
    preferredDestinationCampusId: payload.preferredDestinationCampusId,
    favoriteCampusIds: [] as number[],
    favoriteRouteIds: [] as number[],
    showDepartedTrips: payload.showDepartedTrips,
  };

  await prisma.busUserPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return {
    ...data,
  } satisfies BusUserPreferenceSummary;
}

function buildTripSummary(
  trip: {
    id: number;
    routeId: number;
    dayType: "weekday" | "weekend";
    position: number;
    stopTimes: unknown;
  },
  route: BusRouteSummary,
): BusTripSummary {
  const rawTimes = Array.isArray(trip.stopTimes)
    ? (trip.stopTimes as Array<string | null>)
    : [];

  const stopTimes = route.stops.map<BusTripStopTime>((stop, index) => {
    const time = rawTimes[index] ?? null;
    return {
      stopOrder: stop.stopOrder,
      campusId: stop.campus.id,
      campusName: stop.campus.namePrimary,
      time,
      minutesSinceMidnight: hhmmToMinutes(time),
      isPassThrough: time == null,
    };
  });

  const departureTime = stopTimes[0]?.time ?? null;
  const departureMinutes = stopTimes[0]?.minutesSinceMidnight ?? null;
  const arrivalTime = stopTimes[stopTimes.length - 1]?.time ?? null;
  const arrivalMinutes =
    stopTimes[stopTimes.length - 1]?.minutesSinceMidnight ?? null;

  return {
    id: trip.id,
    routeId: route.id,
    dayType: trip.dayType,
    position: trip.position,
    stopTimes,
    departureTime,
    departureMinutes,
    arrivalTime,
    arrivalMinutes,
  };
}

export async function getBusTimetableData(
  input: BusTimetableInput,
): Promise<BusTimetableData | null> {
  const locale = input.locale ?? "zh-cn";
  const now = input.now ? shanghaiDayjs(input.now) : shanghaiDayjs();
  const dateKey = now.format("YYYY-MM-DD");

  const version = await findEffectiveBusVersion(dateKey, input.versionKey);
  if (!version) return null;

  const [routes, campuses, preference, versions, tripRows] = await Promise.all([
    getRouteRecords(locale).then((records) =>
      records
        .map((record) => buildRouteSummary(locale, record))
        .filter((record): record is BusRouteSummary => record != null),
    ),
    getBusCampuses(locale),
    getBusPreference(input.userId ?? null),
    listBusVersions(),
    prisma.busTrip.findMany({
      where: {
        versionId: version.id,
      },
      orderBy: [{ dayType: "asc" }, { routeId: "asc" }, { position: "asc" }],
    }),
  ]);
  const routeMap = new Map(routes.map((route) => [route.id, route] as const));
  const trips = tripRows
    .map((trip) => {
      const route = routeMap.get(trip.routeId);
      if (!route) return null;
      return buildTripSummary(trip, route);
    })
    .filter((trip): trip is BusTripSummary => trip != null);

  return {
    locale,
    fetchedAt: now.toISOString(),
    version: {
      id: version.id,
      key: version.key,
      title: version.title,
      effectiveFrom: version.effectiveFrom?.toISOString() ?? null,
      effectiveUntil: version.effectiveUntil?.toISOString() ?? null,
      importedAt: version.importedAt.toISOString(),
      notice:
        version.sourceMessage || version.sourceUrl
          ? {
              message: version.sourceMessage ?? null,
              url: version.sourceUrl ?? null,
            }
          : null,
    },
    campuses,
    routes,
    trips,
    availableVersions: versions,
    preferences: preference,
    notice:
      version.sourceMessage || version.sourceUrl
        ? {
            message: version.sourceMessage ?? null,
            url: version.sourceUrl ?? null,
          }
        : null,
  };
}

export async function getBusDashboardSnapshot(
  input: Pick<BusTimetableInput, "locale" | "userId" | "now">,
): Promise<BusDashboardSnapshot | null> {
  const data = await getBusTimetableData({
    locale: input.locale,
    userId: input.userId,
    now: input.now,
  });

  if (!data) return null;

  return {
    data,
  };
}

/* ------------------------------------------------------------------ */
/*  Route catalog (MCP: list_bus_routes)                               */
/* ------------------------------------------------------------------ */

function toRouteListing(
  locale: AppLocale,
  route: RouteRecord,
): BusRouteListing | null {
  if (route.stops.length < 2) return null;
  const desc = describeRoute(locale, route.stops);
  return {
    id: route.id,
    nameCn: route.nameCn,
    nameEn: route.nameEn,
    descriptionPrimary: desc.descriptionPrimary,
    stops: route.stops.map((s) => ({
      stopOrder: s.stopOrder,
      campusId: s.campus.id,
      campusName: s.campus.namePrimary,
    })),
  };
}

export async function listBusRoutes(
  locale: AppLocale,
): Promise<{ routes: BusRouteListing[]; campuses: BusCampusSummary[] }> {
  const [records, campuses] = await Promise.all([
    getRouteRecords(locale),
    getBusCampuses(locale),
  ]);
  const routes = records
    .map((r) => toRouteListing(locale, r))
    .filter((r): r is BusRouteListing => r != null);
  return { routes, campuses };
}

/* ------------------------------------------------------------------ */
/*  Single-route timetable (MCP: get_bus_route_timetable)              */
/* ------------------------------------------------------------------ */

export async function getBusRouteTimetable(input: {
  routeId: number;
  locale: AppLocale;
  now?: string;
  versionKey?: string | null;
}): Promise<BusRouteTimetable | null> {
  const locale = input.locale;
  const now = input.now ? shanghaiDayjs(input.now) : shanghaiDayjs();
  const dateKey = now.format("YYYY-MM-DD");
  const version = await findEffectiveBusVersion(dateKey, input.versionKey);
  if (!version) return null;

  const records = await getRouteRecords(locale);
  const record = records.find((r) => r.id === input.routeId);
  if (!record) return null;
  const listing = toRouteListing(locale, record);
  if (!listing) return null;

  // Fetch weekday + weekend trips
  const [weekdayTrips, weekendTrips] = await Promise.all([
    prisma.busTrip.findMany({
      where: {
        versionId: version.id,
        dayType: "weekday",
        routeId: input.routeId,
      },
      orderBy: { position: "asc" },
    }),
    prisma.busTrip.findMany({
      where: {
        versionId: version.id,
        dayType: "weekend",
        routeId: input.routeId,
      },
      orderBy: { position: "asc" },
    }),
  ]);

  const toSlots = (trips: typeof weekdayTrips): BusTripSlot[] =>
    trips.map((t) => ({
      position: t.position,
      stopTimes: (t.stopTimes as Array<string | null>).map((time, i) => ({
        stopOrder: i,
        time,
      })),
    }));

  // Find alternate routes: same first→last campus pair, different route ID
  const firstCampusId = record.stops[0]?.campus.id;
  const lastCampusId = record.stops[record.stops.length - 1]?.campus.id;
  const alternateRoutes = records
    .filter((r) => {
      if (r.id === input.routeId || r.stops.length < 2) return false;
      const rFirst = r.stops[0]?.campus.id;
      const rLast = r.stops[r.stops.length - 1]?.campus.id;
      return rFirst === firstCampusId && rLast === lastCampusId;
    })
    .map((r) => toRouteListing(locale, r))
    .filter((r): r is BusRouteListing => r != null);

  return {
    route: listing,
    weekday: toSlots(weekdayTrips),
    weekend: toSlots(weekendTrips),
    alternateRoutes,
  };
}

/* ------------------------------------------------------------------ */
/*  Transit map data                                                   */
/* ------------------------------------------------------------------ */

export async function getBusMapData(input: {
  locale: AppLocale;
  now?: string;
  versionKey?: string | null;
}): Promise<BusMapData | null> {
  const locale = input.locale;
  const now = input.now ? shanghaiDayjs(input.now) : shanghaiDayjs();
  const dateKey = now.format("YYYY-MM-DD");
  const todayType = resolveBusDayType(undefined, now);
  const version = await findEffectiveBusVersion(dateKey, input.versionKey);
  if (!version) return null;

  const [records, campuses, allTrips] = await Promise.all([
    getRouteRecords(locale),
    getBusCampuses(locale),
    prisma.busTrip.findMany({
      where: { versionId: version.id, dayType: todayType },
      orderBy: [{ routeId: "asc" }, { position: "asc" }],
    }),
  ]);

  // Count trips per route per day type for edge labels
  const weekdayCounts = await prisma.busTrip.groupBy({
    by: ["routeId"],
    where: { versionId: version.id, dayType: "weekday" },
    _count: true,
  });
  const weekendCounts = await prisma.busTrip.groupBy({
    by: ["routeId"],
    where: { versionId: version.id, dayType: "weekend" },
    _count: true,
  });
  const wdMap = new Map(weekdayCounts.map((c) => [c.routeId, c._count]));
  const weMap = new Map(weekendCounts.map((c) => [c.routeId, c._count]));

  const campusNodes: BusMapCampusNode[] = campuses.map((c) => ({
    id: c.id,
    namePrimary: c.namePrimary,
    nameSecondary: c.nameSecondary,
    latitude: c.latitude,
    longitude: c.longitude,
  }));

  const routeEdges: BusMapRouteEdge[] = records
    .filter((r) => r.stops.length >= 2)
    .map((r) => {
      const desc = describeRoute(locale, r.stops);
      return {
        routeId: r.id,
        descriptionPrimary: desc.descriptionPrimary,
        stops: r.stops.map((s) => ({
          campusId: s.campus.id,
          campusName: s.campus.namePrimary,
        })),
        weekdayTrips: wdMap.get(r.id) ?? 0,
        weekendTrips: weMap.get(r.id) ?? 0,
      };
    });

  // Determine active/upcoming trips
  const nowMinutes = now.hour() * 60 + now.minute();
  const activeTrips: BusMapActiveTrip[] = [];

  for (const trip of allTrips) {
    const stopTimes = trip.stopTimes as Array<string | null>;
    const parsedTimes = stopTimes.map((t) => hhmmToMinutes(t));
    const firstTime = parsedTimes.find((t) => t != null);
    const lastTime = [...parsedTimes].reverse().find((t) => t != null);
    if (firstTime == null || lastTime == null) continue;

    // En-route: now is between first departure and last arrival
    if (nowMinutes >= firstTime && nowMinutes <= lastTime) {
      // Interpolate position between stops
      let fromOrder: number | null = null;
      let toOrder: number | null = null;
      let progress: number | null = null;
      for (let i = 0; i < parsedTimes.length - 1; i++) {
        const a = parsedTimes[i];
        const b = parsedTimes[i + 1];
        if (a != null && b != null && nowMinutes >= a && nowMinutes <= b) {
          fromOrder = i;
          toOrder = i + 1;
          progress = b > a ? (nowMinutes - a) / (b - a) : 0;
          break;
        }
      }
      activeTrips.push({
        tripId: trip.id,
        routeId: trip.routeId,
        status: "en-route",
        departureTime: stopTimes[0] ?? null,
        arrivalTime: stopTimes[stopTimes.length - 1] ?? null,
        fromStopOrder: fromOrder,
        toStopOrder: toOrder,
        segmentProgress:
          progress != null ? Math.round(progress * 100) / 100 : null,
      });
    }
    // Departing soon: departs within next 60 minutes
    else if (firstTime > nowMinutes && firstTime <= nowMinutes + 60) {
      activeTrips.push({
        tripId: trip.id,
        routeId: trip.routeId,
        status: "departing-soon",
        departureTime: stopTimes[0] ?? null,
        arrivalTime: stopTimes[stopTimes.length - 1] ?? null,
        fromStopOrder: null,
        toStopOrder: null,
        segmentProgress: null,
      });
    }
  }

  return {
    campuses: campusNodes,
    routes: routeEdges,
    activeTrips,
    todayType,
    now: now.toISOString(),
  };
}
