import { z } from "zod";

// prettier-ignore
export const BusCampusModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    routeStops: z.array(z.unknown()),
    preferredByOriginUsers: z.array(z.unknown()),
    preferredByDestinationUsers: z.array(z.unknown()),
  })
  .strict();

export type BusCampusPureType = z.infer<typeof BusCampusModelSchema>;

// prettier-ignore
export const BusRouteModelSchema = z
  .object({
    id: z.number().int(),
    nameCn: z.string(),
    nameEn: z.string().nullable(),
    stops: z.array(z.unknown()),
    trips: z.array(z.unknown()),
  })
  .strict();

export type BusRoutePureType = z.infer<typeof BusRouteModelSchema>;

// prettier-ignore
export const BusRouteStopModelSchema = z
  .object({
    id: z.number().int(),
    routeId: z.number().int(),
    campusId: z.number().int(),
    stopOrder: z.number().int(),
    route: z.unknown(),
    campus: z.unknown(),
  })
  .strict();

export type BusRouteStopPureType = z.infer<typeof BusRouteStopModelSchema>;

// prettier-ignore
export const BusScheduleVersionModelSchema = z
  .object({
    id: z.number().int(),
    key: z.string(),
    title: z.string(),
    checksum: z.string(),
    sourceMessage: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    rawJson: z.unknown(),
    effectiveFrom: z.date().nullable(),
    effectiveUntil: z.date().nullable(),
    isEnabled: z.boolean(),
    importedAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
    trips: z.array(z.unknown()),
  })
  .strict();

export type BusScheduleVersionPureType = z.infer<
  typeof BusScheduleVersionModelSchema
>;

// prettier-ignore
export const BusTripModelSchema = z
  .object({
    id: z.number().int(),
    versionId: z.number().int(),
    routeId: z.number().int(),
    dayType: z.enum(["weekday", "weekend"]),
    position: z.number().int(),
    stopTimes: z.unknown(),
    version: z.unknown(),
    route: z.unknown(),
  })
  .strict();

export type BusTripPureType = z.infer<typeof BusTripModelSchema>;

// prettier-ignore
export const BusUserPreferenceModelSchema = z
  .object({
    userId: z.string(),
    preferredOriginCampusId: z.number().int().nullable(),
    preferredDestinationCampusId: z.number().int().nullable(),
    favoriteCampusIds: z.array(z.number().int()),
    favoriteRouteIds: z.array(z.number().int()),
    showDepartedTrips: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    user: z.unknown(),
    preferredOriginCampus: z.unknown().nullable(),
    preferredDestinationCampus: z.unknown().nullable(),
  })
  .strict();

export type BusUserPreferencePureType = z.infer<
  typeof BusUserPreferenceModelSchema
>;
