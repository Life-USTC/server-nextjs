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

let geoDataCache: GeoData | null = null;
let buildingImgRulesCache: BuildingImgRule[] | null = null;

/**
 * Loads geographic data from static JSON file
 */
async function loadGeoData(): Promise<GeoData> {
  if (geoDataCache) return geoDataCache;

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Life-USTC/static/refs/heads/master/static/geo_data.json",
    );
    const data = await response.json();
    geoDataCache = data as GeoData;
    return geoDataCache;
  } catch {
    // Fallback to empty locations if fetch fails
    return { locations: [] };
  }
}

/**
 * Loads building image rules from static JSON file
 */
async function loadBuildingImgRules(): Promise<BuildingImgRule[]> {
  if (buildingImgRulesCache) return buildingImgRulesCache;

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Life-USTC/static/refs/heads/master/static/building_img_rules.json",
    );
    const data = await response.json();
    buildingImgRulesCache = data as BuildingImgRule[];
    return buildingImgRulesCache;
  } catch {
    // Fallback to empty rules if fetch fails
    return [];
  }
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

  // Convert relative path to absolute URL
  const imagePath = rule.path.replace("./imgs/", "");
  return `https://static.life-ustc.tiankaima.dev/imgs/${imagePath}`;
}
