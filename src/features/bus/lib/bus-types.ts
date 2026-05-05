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
  dayType: BusScheduleDayType;
  position: number;
  stopTimes: BusTripStopTime[];
  departureTime: string | null;
  departureMinutes: number | null;
  arrivalTime: string | null;
  arrivalMinutes: number | null;
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
  showDepartedTrips: boolean;
};

export type BusPreferencePayload = BusUserPreferenceSummary;

export type BusTimetableInput = {
  locale: BusLocale;
  now?: string;
  versionKey?: string | null;
  userId?: string | null;
};

export type BusTimetableData = {
  locale: BusLocale;
  fetchedAt: string;
  version: BusScheduleVersionSummary | null;
  availableVersions: BusScheduleVersionSummary[];
  campuses: BusCampusSummary[];
  routes: BusRouteSummary[];
  trips: BusTripSummary[];
  preferences: BusUserPreferenceSummary | null;
  notice: BusNotice | null;
};

export type BusDashboardSnapshot = {
  data: BusTimetableData;
};

/* ------------------------------------------------------------------ */
/*  Route catalog & timetable types (MCP / map)                       */
/* ------------------------------------------------------------------ */

/** Lightweight route listing — no trip data */
export type BusRouteListing = {
  id: number;
  nameCn: string;
  nameEn: string | null;
  descriptionPrimary: string;
  stops: { stopOrder: number; campusId: number; campusName: string }[];
};

/** Full timetable for a single route (both day types) */
export type BusRouteTimetable = {
  route: BusRouteListing;
  weekday: BusTripSlot[];
  weekend: BusTripSlot[];
  /** Other routes that share the same origin→destination campus pair */
  alternateRoutes: BusRouteListing[];
};

/** Compact trip slot for timetable display */
export type BusTripSlot = {
  position: number;
  stopTimes: { stopOrder: number; time: string | null }[];
};

/* ------------------------------------------------------------------ */
/*  Transit map types                                                  */
/* ------------------------------------------------------------------ */

export type BusMapCampusNode = {
  id: number;
  namePrimary: string;
  nameSecondary: string | null;
  latitude: number;
  longitude: number;
};

export type BusMapRouteEdge = {
  routeId: number;
  descriptionPrimary: string;
  stops: { campusId: number; campusName: string }[];
  weekdayTrips: number;
  weekendTrips: number;
};

export type BusMapActiveTrip = {
  tripId: number;
  routeId: number;
  status: "en-route" | "departing-soon";
  departureTime: string | null;
  arrivalTime: string | null;
  /** Current segment: between stop at fromOrder and toOrder */
  fromStopOrder: number | null;
  toStopOrder: number | null;
  /** Progress 0–1 within current segment (interpolated from schedule) */
  segmentProgress: number | null;
};

export type BusMapData = {
  campuses: BusMapCampusNode[];
  routes: BusMapRouteEdge[];
  activeTrips: BusMapActiveTrip[];
  todayType: "weekday" | "weekend";
  now: string;
};

export type BusNextDeparture = {
  tripId: number;
  routeId: number;
  route: {
    id: number;
    nameCn: string;
    nameEn: string | null;
    descriptionPrimary: string;
    descriptionSecondary: string | null;
  };
  originCampus: BusCampusSummary | null;
  destinationCampus: BusCampusSummary | null;
  departureTime: string | null;
  arrivalTime: string | null;
  departureEstimated: boolean;
  arrivalEstimated: boolean;
  minutesUntilDeparture: number | null;
  dayType: BusScheduleDayType;
  status: BusTripStatus;
};

export type BusNextDeparturesResult = {
  originCampus: BusCampusSummary | null;
  destinationCampus: BusCampusSummary | null;
  atTime: string;
  dayType: "weekday" | "weekend";
  totalRoutes: number;
  departures: BusNextDeparture[];
  nextAvailableDeparture: BusNextDeparture | null;
  message: string | null;
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
