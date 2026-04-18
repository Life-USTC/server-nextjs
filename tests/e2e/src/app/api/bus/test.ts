/**
 * E2E tests for bus schedule APIs
 *
 * ## GET /api/bus
 * Public shuttle-bus schedule query endpoint (no authentication required).
 * - Accepts: dayType ("weekday"|"weekend"|"auto"), now, versionKey, limit,
 *   showDepartedTrips, includeAllTrips, favoriteCampusIds (comma-separated)
 * - Returns: { version, availableVersions, recommended, matches }
 * - `matches[].isRecommended` = true when route serves a favorite campus
 * - Returns 400 for invalid params, 404 when no schedule data
 *
 * ## GET/POST /api/bus/preferences
 * Authenticated endpoint for user bus preferences.
 * - GET: returns current preference or null
 * - POST: saves preference (Zod-validated), returns updated preference
 * - 401 for unauthenticated, 400 for invalid body
 *
 * ## Seed data (tools/dev/seed/seed-dev-scenarios.ts)
 * - 6 campuses: 东区(1), 西区(2), 北区(3), 南区(4), 先研院(5), 高新(6)
 * - 4 routes: 1(东→北→西), 3(东→南), 7(高→先→西→东), 8(东→西→先→高)
 * - Weekday: 4 trips on R1, 3 on R3, 3 on R7, 3 on R8 = 13 total
 * - Weekend: 3 trips on R1, 2 on R3, 2 on R7, 2 on R8 = 9 total
 * - Debug user preference: favoriteCampusIds=[1], showDepartedTrips=false
 *
 * NOTE: The database may contain additional routes from static loading.
 * Tests that verify exact counts use `versionKey=dev-scenario-bus` to isolate.
 */
import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";

const BASE = "/api/bus";
const PREF_BASE = "/api/bus/preferences";
const SEED_VERSION = `versionKey=${DEV_SEED.bus.versionKey}`;

type BusTrip = {
  id?: number;
  departureTime?: string | null;
  status?: string;
};

type BusMatch = {
  route?: {
    id?: number;
    descriptionPrimary?: string | null;
    stops?: Array<{ campus?: { id?: number; namePrimary?: string } }>;
  };
  allTrips?: BusTrip[];
  visibleTrips?: BusTrip[];
  totalTrips?: number;
  isRecommended?: boolean;
};

type BusResponse = {
  version?: { key?: string; title?: string | null };
  availableVersions?: Array<{ key?: string }>;
  recommended?: BusMatch | null;
  matches?: BusMatch[];
};

type PreferenceResponse = {
  preference?: {
    favoriteCampusIds?: number[];
    favoriteRouteIds?: number[];
    preferredOriginCampusId?: number | null;
    preferredDestinationCampusId?: number | null;
    showDepartedTrips?: boolean;
  };
};

/* ── GET /api/bus ─────────────────────────────────────────── */
test.describe("GET /api/bus", () => {
  test("returns schedule with seed routes and correct version", async ({
    request,
  }) => {
    const response = await request.get(`${BASE}?${SEED_VERSION}`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    expect(body.version?.key).toBe(DEV_SEED.bus.versionKey);
    expect(
      body.availableVersions?.some((v) => v.key === DEV_SEED.bus.versionKey),
    ).toBe(true);
    // Routes with trips in seed version (routes without trips still returned with 0 trips)
    const routesWithTrips =
      body.matches?.filter((m) => (m.totalTrips ?? 0) > 0) ?? [];
    expect(routesWithTrips.length).toBe(4);
    expect(body.recommended).not.toBeNull();

    // All four seed route IDs present among those with trips
    const routeIds = routesWithTrips.map((m) => m.route?.id).sort();
    expect(routeIds).toEqual([1, 3, 7, 8]);
  });

  test("weekday dayType returns 13 total trips across all routes", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&dayType=weekday&includeAllTrips=true&showDepartedTrips=true`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    const totalTrips = (body.matches ?? []).reduce(
      (sum, m) => sum + (m.allTrips?.length ?? 0),
      0,
    );
    // Weekday: R1=4, R3=3, R7=3, R8=3 = 13
    expect(totalTrips).toBe(13);
  });

  test("weekend dayType returns 9 total trips across all routes", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&dayType=weekend&includeAllTrips=true&showDepartedTrips=true`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    const totalTrips = (body.matches ?? []).reduce(
      (sum, m) => sum + (m.allTrips?.length ?? 0),
      0,
    );
    // Weekend: R1=3, R3=2, R7=2, R8=2 = 9
    expect(totalTrips).toBe(9);
  });

  test("favoriteCampusIds=1 marks all seed routes through 东区 as recommended", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&favoriteCampusIds=1&includeAllTrips=true&showDepartedTrips=true`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    // Among routes with trips in seed version, all 4 pass through 东区
    const routesWithTrips =
      body.matches?.filter((m) => (m.totalTrips ?? 0) > 0) ?? [];
    for (const match of routesWithTrips) {
      expect(match.isRecommended).toBe(true);
    }
    expect(routesWithTrips.length).toBe(4);
  });

  test("favoriteCampusIds=4 marks route 3 as recommended (only seed route through 南区)", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&favoriteCampusIds=4&includeAllTrips=true&showDepartedTrips=true`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    // Among routes with trips, only route 3 (東→南) passes through 南区
    const routesWithTrips =
      body.matches?.filter((m) => (m.totalTrips ?? 0) > 0) ?? [];
    const recommended = routesWithTrips.filter((m) => m.isRecommended);
    expect(recommended.length).toBe(1);
    expect(recommended[0].route?.id).toBe(3);
  });

  test("multiple favoriteCampusIds (4,5) marks routes through 南区 or 先研院", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&favoriteCampusIds=4,5&includeAllTrips=true&showDepartedTrips=true`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as BusResponse;

    // Among routes with trips: R3→campus 4, R7&R8→campus 5, R1→neither
    const routesWithTrips =
      body.matches?.filter((m) => (m.totalTrips ?? 0) > 0) ?? [];
    const recommended = routesWithTrips.filter((m) => m.isRecommended);
    const recommendedIds = recommended.map((m) => m.route?.id).sort();
    expect(recommendedIds).toEqual([3, 7, 8]);
  });

  test("includeAllTrips=true returns all trips regardless of time", async ({
    request,
  }) => {
    const withAll = await request.get(
      `${BASE}?${SEED_VERSION}&dayType=weekday&includeAllTrips=true&showDepartedTrips=true`,
    );
    const body = (await withAll.json()) as BusResponse;
    const totalTrips = (body.matches ?? []).reduce(
      (sum, m) => sum + (m.allTrips?.length ?? 0),
      0,
    );
    // Must be exactly 13 weekday trips
    expect(totalTrips).toBe(13);
  });

  test("invalid originCampusId (from=abc) returns 400", async ({ request }) => {
    const response = await request.get(`${BASE}?from=not-a-number`);
    expect(response.status()).toBe(400);
  });

  test("specific route trip times match seed data", async ({ request }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&dayType=weekday&includeAllTrips=true&showDepartedTrips=true`,
    );
    const body = (await response.json()) as BusResponse;

    // Route 8 weekday trips: 06:50, 12:50, 21:20
    const route8 = body.matches?.find((m) => m.route?.id === 8);
    expect(route8).toBeDefined();
    const departures = route8?.allTrips
      ?.map((t) => t.departureTime)
      .filter(Boolean)
      .sort();
    expect(departures).toEqual(["06:50", "12:50", "21:20"]);
  });

  test("route stops match seed data topology", async ({ request }) => {
    const response = await request.get(
      `${BASE}?${SEED_VERSION}&dayType=weekday&includeAllTrips=true&showDepartedTrips=true`,
    );
    const body = (await response.json()) as BusResponse;

    // Route 8: 东区 → 西区 → 先研院 → 高新
    const route8 = body.matches?.find((m) => m.route?.id === 8);
    const stopIds = route8?.route?.stops?.map((s) => s.campus?.id);
    expect(stopIds).toEqual([1, 2, 5, 6]);

    // Route 7: 高新 → 先研院 → 西区 → 东区
    const route7 = body.matches?.find((m) => m.route?.id === 7);
    const stop7Ids = route7?.route?.stops?.map((s) => s.campus?.id);
    expect(stop7Ids).toEqual([6, 5, 2, 1]);
  });
});

/* ── GET/POST /api/bus/preferences ────────────────────────── */
test.describe("/api/bus/preferences", () => {
  test("GET without auth returns 401", async ({ request }) => {
    const response = await request.get(PREF_BASE);
    expect(response.status()).toBe(401);
  });

  test("POST without auth returns 401", async ({ request }) => {
    const response = await request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [1],
        showDepartedTrips: false,
      },
    });
    expect(response.status()).toBe(401);
  });

  test("authenticated GET returns seeded preference", async ({ page }) => {
    await signInAsDebugUser(page, "/");

    const response = await page.request.get(PREF_BASE);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as PreferenceResponse;

    // Seed sets favoriteCampusIds=[1], showDepartedTrips=false
    expect(body.preference?.favoriteCampusIds).toEqual([1]);
    expect(body.preference?.showDepartedTrips).toBe(false);
  });

  test("POST saves preference and GET reads it back", async ({ page }) => {
    await signInAsDebugUser(page, "/");

    // Save new preference
    const saveResponse = await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [2, 4],
        favoriteRouteIds: [3],
        preferredOriginCampusId: null,
        preferredDestinationCampusId: null,
        showDepartedTrips: true,
      },
    });
    expect(saveResponse.status()).toBe(200);
    const saveBody = (await saveResponse.json()) as PreferenceResponse;
    expect(saveBody.preference?.favoriteCampusIds).toEqual([2, 4]);
    expect(saveBody.preference?.showDepartedTrips).toBe(true);

    // Read it back
    const getResponse = await page.request.get(PREF_BASE);
    expect(getResponse.status()).toBe(200);
    const getBody = (await getResponse.json()) as PreferenceResponse;
    expect(getBody.preference?.favoriteCampusIds).toEqual([2, 4]);
    expect(getBody.preference?.favoriteRouteIds).toEqual([3]);
    expect(getBody.preference?.showDepartedTrips).toBe(true);

    // Restore original preference for other tests
    await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [1],
        favoriteRouteIds: [],
        preferredOriginCampusId: null,
        preferredDestinationCampusId: null,
        showDepartedTrips: false,
      },
    });
  });

  test("POST with invalid body returns 400", async ({ page }) => {
    await signInAsDebugUser(page, "/");

    const response = await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: "not-an-array",
        showDepartedTrips: "not-a-boolean",
      },
    });
    expect(response.status()).toBe(400);
  });

  test("preference save preserves unrelated fields (regression)", async ({
    page,
  }) => {
    await signInAsDebugUser(page, "/");

    // First, save a preference with favoriteRouteIds set
    await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [1],
        favoriteRouteIds: [8],
        preferredOriginCampusId: 1,
        preferredDestinationCampusId: 6,
        showDepartedTrips: false,
      },
    });

    // Now save with different favoriteCampusIds but include all fields
    const saveResponse = await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [1, 2],
        favoriteRouteIds: [8],
        preferredOriginCampusId: 1,
        preferredDestinationCampusId: 6,
        showDepartedTrips: false,
      },
    });
    expect(saveResponse.status()).toBe(200);

    // Read back and verify ALL fields preserved
    const getResponse = await page.request.get(PREF_BASE);
    const body = (await getResponse.json()) as PreferenceResponse;
    expect(body.preference?.favoriteCampusIds).toEqual([1, 2]);
    expect(body.preference?.favoriteRouteIds).toEqual([8]);
    expect(body.preference?.preferredOriginCampusId).toBe(1);
    expect(body.preference?.preferredDestinationCampusId).toBe(6);

    // Restore original
    await page.request.post(PREF_BASE, {
      data: {
        favoriteCampusIds: [1],
        favoriteRouteIds: [],
        preferredOriginCampusId: null,
        preferredDestinationCampusId: null,
        showDepartedTrips: false,
      },
    });
  });
});
