/**
 * E2E tests for GET /api/bus
 *
 * Public shuttle-bus schedule query endpoint (no authentication required).
 *
 * - GET accepts query parameters:
 *   - `from` / `originCampusId` and `to` / `destinationCampusId` (integer campus IDs)
 *   - `dayType` ("weekday" | "weekend" | "auto")
 *   - `now`, `versionKey`, `limit`, `showDepartedTrips`, `includeAllTrips`
 *   - `favoriteCampusIds`, `favoriteRouteIds` (comma-separated)
 * - Returns `{ version, availableVersions, recommended, matches }` shape
 * - Returns 400 for invalid parameters (e.g. non-integer campus ID)
 * - Returns 404 if no bus schedule data is available
 *
 * Note: Response content is time-sensitive; seed data ensures at least one
 * matching route for the DEV_SEED campus pair.
 */
import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";

const BASE = "/api/bus";

test.describe("GET /api/bus", () => {
  test("public endpoint returns schedule with recommended route", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE}?from=${DEV_SEED.bus.originCampusId}&to=${DEV_SEED.bus.destinationCampusId}`,
    );
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      version?: { key?: string; title?: string | null };
      availableVersions?: Array<{ key?: string }>;
      recommended?: {
        route?: { id?: number; descriptionPrimary?: string | null };
        nextTrip?: { departureTime?: string | null };
      } | null;
      matches?: Array<{ route?: { id?: number } }>;
    };

    expect(body.version?.key).toBe(DEV_SEED.bus.versionKey);
    expect(
      body.availableVersions?.some(
        (item) => item.key === DEV_SEED.bus.versionKey,
      ),
    ).toBe(true);
    expect(body.recommended?.route?.id).toBe(DEV_SEED.bus.recommendedRouteId);
    expect(body.recommended?.route?.descriptionPrimary).toContain("东区");
    expect(body.recommended?.nextTrip?.departureTime).toBeTruthy();
    expect(
      body.matches?.some((item) => item.route?.id === DEV_SEED.bus.routeId),
    ).toBe(true);
  });

  test("invalid originCampusId returns 400", async ({ request }) => {
    const response = await request.get(`${BASE}?from=not-a-number`);
    expect(response.status()).toBe(400);
  });
});
