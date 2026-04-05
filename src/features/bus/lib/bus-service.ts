import type { AppLocale } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import type {
  BusCampusSummary,
  BusDashboardSnapshot,
  BusPreferencePayload,
  BusQueryInput,
  BusQueryResult,
  BusResolvedDayType,
  BusRouteMatch,
  BusRouteStopSummary,
  BusRouteSummary,
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

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value))));
}

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

function scoreMatch(match: BusRouteMatch, favoriteCampusIds: number[]) {
  let score = 0;
  if (match.isRecommended) score += 100;
  // Bonus for each favorite campus the route passes through
  for (const stop of match.route.stops) {
    if (favoriteCampusIds.includes(stop.campus.id)) score += 40;
  }
  if (match.nextTrip?.minutesUntilDeparture != null) {
    score += Math.max(0, 60 - match.nextTrip.minutesUntilDeparture);
  }
  return score;
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
      favoriteCampusIds: [],
      favoriteRouteIds: [],
      showDepartedTrips: false,
    };
  }

  return {
    preferredOriginCampusId: preference.preferredOriginCampusId,
    preferredDestinationCampusId: preference.preferredDestinationCampusId,
    favoriteCampusIds: preference.favoriteCampusIds,
    favoriteRouteIds: preference.favoriteRouteIds,
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
    favoriteCampusIds: uniqueNumbers(payload.favoriteCampusIds),
    favoriteRouteIds: uniqueNumbers(payload.favoriteRouteIds),
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
  nowMinutes: number,
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
  const status =
    departureMinutes == null || departureMinutes >= nowMinutes
      ? "upcoming"
      : "departed";

  return {
    id: trip.id,
    routeId: route.id,
    route,
    dayType: trip.dayType,
    position: trip.position,
    stopTimes,
    departureTime,
    departureMinutes,
    arrivalTime,
    arrivalMinutes,
    status,
    minutesUntilDeparture:
      departureMinutes == null ? null : departureMinutes - nowMinutes,
  };
}

export async function queryBusSchedules(
  input: BusQueryInput,
): Promise<BusQueryResult | null> {
  const locale = input.locale ?? "zh-cn";
  const now = input.now ? shanghaiDayjs(input.now) : shanghaiDayjs();
  const dateKey = now.format("YYYY-MM-DD");
  const todayType = resolveBusDayType(input.dayType, now);

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
        dayType: todayType,
      },
      orderBy: [{ routeId: "asc" }, { position: "asc" }],
    }),
  ]);
  const nowMinutes = now.hour() * 60 + now.minute();
  const effectivePreference: BusUserPreferenceSummary = {
    preferredOriginCampusId:
      input.originCampusId ?? preference?.preferredOriginCampusId ?? null,
    preferredDestinationCampusId:
      input.destinationCampusId ??
      preference?.preferredDestinationCampusId ??
      null,
    favoriteCampusIds: uniqueNumbers(
      input.favoriteCampusIds ?? preference?.favoriteCampusIds ?? [],
    ),
    favoriteRouteIds: uniqueNumbers(
      input.favoriteRouteIds ?? preference?.favoriteRouteIds ?? [],
    ),
    showDepartedTrips:
      input.showDepartedTrips ?? preference?.showDepartedTrips ?? false,
  };

  const matches = routes
    .flatMap<BusRouteMatch>((route) => {
      const allTrips = tripRows
        .filter((trip) => trip.routeId === route.id)
        .map((trip) => buildTripSummary(trip, route, nowMinutes));
      const upcomingTrips = allTrips.filter(
        (trip) => trip.status === "upcoming",
      );
      const visibleTrips = effectivePreference.showDepartedTrips
        ? allTrips
        : upcomingTrips;

      // A route is recommended if any stop serves a favorite campus
      const isRecommended =
        effectivePreference.favoriteCampusIds.length > 0 &&
        route.stops.some((stop) =>
          effectivePreference.favoriteCampusIds.includes(stop.campus.id),
        );

      return [
        {
          route,
          originStop: route.stops[0],
          destinationStop: route.stops[route.stops.length - 1],
          nextTrip: upcomingTrips[0] ?? null,
          upcomingTrips: input.limit
            ? upcomingTrips.slice(0, input.limit)
            : upcomingTrips,
          visibleTrips: input.limit
            ? visibleTrips.slice(0, input.limit)
            : visibleTrips,
          allTrips,
          totalTrips: allTrips.length,
          isRecommended,
        },
      ];
    })
    .sort((left, right) => {
      const scoreDiff =
        scoreMatch(right, effectivePreference.favoriteCampusIds) -
        scoreMatch(left, effectivePreference.favoriteCampusIds);

      if (scoreDiff !== 0) return scoreDiff;

      const leftMinutes =
        left.nextTrip?.minutesUntilDeparture ?? Number.MAX_SAFE_INTEGER;
      const rightMinutes =
        right.nextTrip?.minutesUntilDeparture ?? Number.MAX_SAFE_INTEGER;

      if (leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;
      return left.route.id - right.route.id;
    });

  const recommended =
    matches.find((match) => match.isRecommended) ?? matches[0] ?? null;

  return {
    locale,
    now: now.toISOString(),
    todayType,
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
    availableVersions: versions,
    preferences: effectivePreference,
    recommended,
    matches,
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
  input: Pick<BusQueryInput, "locale" | "userId" | "now" | "dayType">,
): Promise<BusDashboardSnapshot | null> {
  const data = await queryBusSchedules({
    locale: input.locale,
    userId: input.userId,
    now: input.now,
    dayType: input.dayType,
  });

  if (!data) return null;

  return {
    data,
    highlightRoute: data.recommended ?? data.matches[0] ?? null,
  };
}
