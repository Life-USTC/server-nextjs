import { expect, type Page } from "@playwright/test";
import { DEV_SEED } from "./dev-seed";

export async function ensureSeedSectionSubscription(page: Page) {
  const matchResponse = await page.request.post("/api/sections/match-codes", {
    data: { codes: [DEV_SEED.section.code] },
  });
  expect(matchResponse.status()).toBe(200);
  const matchBody = (await matchResponse.json()) as {
    sections?: Array<{ id?: number; code?: string | null }>;
  };
  const sectionId = matchBody.sections?.find(
    (section) => section.code === DEV_SEED.section.code,
  )?.id;
  expect(sectionId).toBeDefined();

  const subscriptionResponse = await page.request.post(
    "/api/calendar-subscriptions",
    {
      data: { sectionIds: [sectionId] },
    },
  );
  expect(subscriptionResponse.status()).toBe(200);
}
