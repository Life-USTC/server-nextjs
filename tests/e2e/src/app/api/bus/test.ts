/**
 * E2E tests for GET /api/bus
 *
 * Public shuttle-bus schedule query endpoint (no authentication required).
 *
 * - GET accepts query parameters:
 *   - `dayType` ("weekday" | "weekend" | "auto")
 *   - `now`, `versionKey`, `limit`, `showDepartedTrips`, `includeAllTrips`
 *   - `favoriteCampusIds` (comma-separated)
 * - Returns `{ version, availableVersions, recommended, matches }` shape
 * - `recommended` is the first match with isRecommended=true, or first match overall
 * - `matches[].isRecommended` is true when the route serves a favorite campus
 * - Returns 400 for invalid parameters (e.g. non-integer campus ID)
 * - Returns 404 if no bus schedule data is available
 * - Origin/destination query params still accepted but no longer filter routes
 *
 * Note: Response content is time-sensitive; seed data ensures at least one
 * matching route exists.
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";

const BASE = "/api/bus";

test.describe("GET /api/bus", () => {
  test("public endpoint returns schedule with all routes", async ({
    request,
  }) => {
    const response = await request.get(BASE);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      version?: { key?: string; title?: string | null };
      availableVersions?: Array<{ key?: string }>;
      recommended?: {
        route?: { id?: number; descriptionPrimary?: string | null };
        nextTrip?: { departureTime?: string | null };
        isRecommended?: boolean;
      } | null;
      matches?: Array<{
        route?: { id?: number };
        isRecommended?: boolean;
      }>;
    };

    expect(body.version?.key).toBe(DEV_SEED.bus.versionKey);
    expect(
      body.availableVersions?.some(
        (item) => item.key === DEV_SEED.bus.versionKey,
      ),
    ).toBe(true);
    // All 4 seed routes are returned (no filtering)
    expect(body.matches?.length).toBeGreaterThanOrEqual(4);
    expect(body.recommended).not.toBeNull();
    expect(
      body.matches?.some((item) => item.route?.id === DEV_SEED.bus.routeId),
    ).toBe(true);
  });

  test("favoriteCampusIds marks matching routes as recommended", async ({
    request,
  }) => {
    const response = await request.get(`${BASE}?favoriteCampusIds=1`);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      matches?: Array<{
        route?: { id?: number; stops?: Array<{ campus?: { id?: number } }> };
        isRecommended?: boolean;
      }>;
    };

    // Routes through 东区 (campus id=1) should be recommended
    for (const match of body.matches ?? []) {
      const passesThroughEast = match.route?.stops?.some(
        (s) => s.campus?.id === 1,
      );
      expect(match.isRecommended).toBe(!!passesThroughEast);
    }
  });

  test("invalid originCampusId returns 400", async ({ request }) => {
    const response = await request.get(`${BASE}?from=not-a-number`);
    expect(response.status()).toBe(400);
  });
});
