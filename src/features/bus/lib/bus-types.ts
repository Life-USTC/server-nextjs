import type { BusScheduleDayType } from "@/generated/prisma/client";

export type BusLocale = "zh-cn" | "en-us";
export type BusResolvedDayType = BusScheduleDayType | "auto";
export type BusTripStatus = "upcoming" | "departed";

export type BusCampusSummary = {
  id: number;
  nameCn: string;
  nameEn: string | null;
  namePrimary: string;
  nameSecondary: string | null;
  latitude: number;
  longitude: number;
};

export type BusRouteStopSummary = {
  stopOrder: number;
  campus: BusCampusSummary;
};

export type BusRouteSummary = {
  id: number;
  nameCn: string;
  nameEn: string | null;
  descriptionPrimary: string;
  descriptionSecondary: string | null;
  stops: BusRouteStopSummary[];
};

export type BusTripStopTime = {
  stopOrder: number;
  campusId: number;
  campusName: string;
  time: string | null;
  minutesSinceMidnight: number | null;
  isPassThrough: boolean;
};

export type BusTripSummary = {
  id: number;
  routeId: number;
  route: BusRouteSummary;
  dayType: BusScheduleDayType;
  position: number;
  stopTimes: BusTripStopTime[];
  departureTime: string | null;
  departureMinutes: number | null;
  arrivalTime: string | null;
  arrivalMinutes: number | null;
  status: BusTripStatus;
  minutesUntilDeparture: number | null;
};

export type BusNotice = {
  message: string | null;
  url: string | null;
};

export type BusScheduleVersionSummary = {
  id: number;
  key: string;
  title: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  importedAt: string;
  notice: BusNotice | null;
};

export type BusUserPreferenceSummary = {
  preferredOriginCampusId: number | null;
  preferredDestinationCampusId: number | null;
  favoriteCampusIds: number[];
  favoriteRouteIds: number[];
  showDepartedTrips: boolean;
};

export type BusPreferencePayload = BusUserPreferenceSummary;

export type BusQueryInput = {
  locale: BusLocale;
  now?: string;
  dayType?: BusResolvedDayType;
  originCampusId?: number | null;
  destinationCampusId?: number | null;
  favoriteRouteIds?: number[];
  favoriteCampusIds?: number[];
  showDepartedTrips?: boolean;
  includeAllTrips?: boolean;
  limit?: number;
  versionKey?: string | null;
  userId?: string | null;
};

export type BusRouteMatch = {
  route: BusRouteSummary;
  originStop: BusRouteStopSummary;
  destinationStop: BusRouteStopSummary;
  nextTrip: BusTripSummary | null;
  upcomingTrips: BusTripSummary[];
  visibleTrips: BusTripSummary[];
  allTrips: BusTripSummary[];
  totalTrips: number;
  isFavoriteRoute: boolean;
  isFavoriteOrigin: boolean;
  isFavoriteDestination: boolean;
};

export type BusQueryResult = {
  locale: BusLocale;
  now: string;
  todayType: BusScheduleDayType;
  version: BusScheduleVersionSummary | null;
  availableVersions: BusScheduleVersionSummary[];
  campuses: BusCampusSummary[];
  routes: BusRouteSummary[];
  preferences: BusUserPreferenceSummary | null;
  recommended: BusRouteMatch | null;
  matches: BusRouteMatch[];
  notice: BusNotice | null;
};

export type BusDashboardSnapshot = {
  data: BusQueryResult;
  highlightRoute: BusRouteMatch | null;
};

export type BusImportResult = {
  versionId: number;
  versionKey: string;
  campuses: number;
  routes: number;
  trips: number;
};

export type BusStaticCampus = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

export type BusStaticRoute = {
  id: number;
  campuses: BusStaticCampus[];
};

export type BusStaticRouteSchedule = {
  id: number;
  route: BusStaticRoute;
  time: Array<Array<string | null>>;
};

export type BusStaticPayload = {
  campuses: BusStaticCampus[];
  routes: BusStaticRoute[];
  weekday_routes: BusStaticRouteSchedule[];
  weekend_routes: BusStaticRouteSchedule[];
  message?: {
    message?: string;
    url?: string;
  } | null;
};
