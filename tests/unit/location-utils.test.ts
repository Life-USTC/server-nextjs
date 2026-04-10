import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SAMPLE_GEO_DATA = {
  locations: [
    { name: "Library", latitude: 31.842, longitude: 117.262 },
    { name: "East Campus Gate", latitude: 31.841, longitude: 117.265 },
    { name: "Science Building", latitude: 31.843, longitude: 117.263 },
  ],
};

const SAMPLE_BUILDING_RULES = [
  { regex: "5\\d{3}", path: "./imgs/teaching_building_5.jpg" },
  { regex: "3[ABC]\\d{3}", path: "./imgs/building_3.jpg" },
  { regex: "LIB\\d+", path: "./imgs/library.jpg" },
];

describe("location-utils", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset module-level caches by resetting the module
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupFetch() {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("geo_data.json")) {
        return { json: async () => SAMPLE_GEO_DATA };
      }
      if (url.includes("building_img_rules.json")) {
        return { json: async () => SAMPLE_BUILDING_RULES };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  }

  describe("getLocationGeo", () => {
    it("returns null for empty string", async () => {
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("");
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("finds exact match (case-insensitive)", async () => {
      setupFetch();
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("library");
      expect(result).toEqual({
        name: "Library",
        latitude: 31.842,
        longitude: 117.262,
      });
    });

    it("finds exact match with different casing", async () => {
      setupFetch();
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("SCIENCE BUILDING");
      expect(result).toEqual({
        name: "Science Building",
        latitude: 31.843,
        longitude: 117.263,
      });
    });

    it("falls back to starts-with match", async () => {
      setupFetch();
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("East Campus Gate Room 101");
      expect(result).toEqual({
        name: "East Campus Gate",
        latitude: 31.841,
        longitude: 117.265,
      });
    });

    it("returns null when no match found", async () => {
      setupFetch();
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("Nonexistent Place");
      expect(result).toBeNull();
    });

    it("handles fetch failure gracefully", async () => {
      fetchMock.mockRejectedValue(new Error("Network error"));
      const { getLocationGeo } = await import("@/lib/location-utils");
      const result = await getLocationGeo("Library");
      expect(result).toBeNull();
    });
  });

  describe("getBuildingImagePath", () => {
    it("returns null for empty string", async () => {
      const { getBuildingImagePath } = await import("@/lib/location-utils");
      const result = await getBuildingImagePath("");
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("matches regex rules and builds URL", async () => {
      setupFetch();
      const { getBuildingImagePath } = await import("@/lib/location-utils");
      const result = await getBuildingImagePath("5101");
      expect(result).toBe(
        "https://static.life-ustc.tiankaima.dev/imgs/teaching_building_5.jpg",
      );
    });

    it("matches a different regex rule", async () => {
      setupFetch();
      const { getBuildingImagePath } = await import("@/lib/location-utils");
      const result = await getBuildingImagePath("3A201");
      expect(result).toBe(
        "https://static.life-ustc.tiankaima.dev/imgs/building_3.jpg",
      );
    });

    it("returns null when no regex matches", async () => {
      setupFetch();
      const { getBuildingImagePath } = await import("@/lib/location-utils");
      const result = await getBuildingImagePath("UNKNOWN_CODE");
      expect(result).toBeNull();
    });

    it("handles fetch failure gracefully", async () => {
      fetchMock.mockRejectedValue(new Error("Network error"));
      const { getBuildingImagePath } = await import("@/lib/location-utils");
      const result = await getBuildingImagePath("5101");
      expect(result).toBeNull();
    });
  });
});
