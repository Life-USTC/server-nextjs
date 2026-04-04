import { expect, test } from "@playwright/test";
import { DEV_SEED } from "../../../../utils/dev-seed";

test("/api/bus 公开可访问并返回推荐路线", async ({ request }) => {
  const response = await request.get(
    `/api/bus?from=${DEV_SEED.bus.originCampusId}&to=${DEV_SEED.bus.destinationCampusId}`,
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
