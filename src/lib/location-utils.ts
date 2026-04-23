import {
  fetchLifeUstcStaticJson,
  getLifeUstcStaticUrl,
} from "@/lib/static-assets";

/**
 * Minimal shape for schedule location formatting.
 * Compatible with both Prisma-selected and client-fetched schedules.
 */
export type ScheduleLocationInfo = {
  customPlace: string | null;
  room: {
    namePrimary: string;
    building: {
      namePrimary: string;
      campus: { namePrimary: string } | null;
    } | null;
  } | null;
};

/**
 * Formats a schedule's location string from room → building → campus.
 */
export function formatScheduleLocation(schedule: ScheduleLocationInfo): string {
  if (schedule.customPlace) return schedule.customPlace;
  if (!schedule.room) return "—";

  const parts = [schedule.room.namePrimary];
  if (schedule.room.building) {
    parts.push(schedule.room.building.namePrimary);
    if (schedule.room.building.campus) {
      parts.push(schedule.room.building.campus.namePrimary);
    }
  }

  return parts.join(" · ");
}

interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface GeoData {
  locations: GeoLocation[];
}

interface BuildingImgRule {
  regex: string;
  path: string;
}

const GEO_DATA_FILE = "geo_data.json";
const BUILDING_IMG_RULES_FILE = "building_img_rules.json";

let geoDataCache: GeoData | null = null;
let buildingImgRulesCache: BuildingImgRule[] | null = null;

async function readStaticJson<T>(fileName: string, fallback: T): Promise<T> {
  return await fetchLifeUstcStaticJson(fileName, fallback);
}

/**
 * Loads geographic data from the published static host.
 */
async function loadGeoData(): Promise<GeoData> {
  if (geoDataCache) return geoDataCache;
  geoDataCache = await readStaticJson(GEO_DATA_FILE, { locations: [] });
  return geoDataCache;
}

/**
 * Loads building image rules from the published static host.
 */
async function loadBuildingImgRules(): Promise<BuildingImgRule[]> {
  if (buildingImgRulesCache) return buildingImgRulesCache;
  buildingImgRulesCache = await readStaticJson(BUILDING_IMG_RULES_FILE, []);
  return buildingImgRulesCache;
}

/**
 * Finds geographic coordinates for a location by name
 */
export async function getLocationGeo(
  locationName: string,
): Promise<GeoLocation | null> {
  if (!locationName) return null;

  const geoData = await loadGeoData();

  // Try exact match first
  let location = geoData.locations.find(
    (loc) => loc.name.toLowerCase() === locationName.toLowerCase(),
  );

  // Try starts with match if exact match not found
  if (!location) {
    location = geoData.locations.find((loc) =>
      locationName.toLowerCase().startsWith(loc.name.toLowerCase()),
    );
  }

  return location || null;
}

/**
 * Finds the building image path based on room code
 */
export async function getBuildingImagePath(
  roomCode: string,
): Promise<string | null> {
  if (!roomCode) return null;

  const rules = await loadBuildingImgRules();

  const rule = rules.find((r) => {
    try {
      const regex = new RegExp(`^${r.regex}$`);
      return regex.test(roomCode);
    } catch {
      return false;
    }
  });

  if (!rule) return null;

  if (/^https?:\/\//i.test(rule.path)) {
    return rule.path;
  }

  // Convert relative path to absolute URL
  const imagePath = rule.path.replace("./imgs/", "");
  return getLifeUstcStaticUrl(`imgs/${imagePath}`);
}
