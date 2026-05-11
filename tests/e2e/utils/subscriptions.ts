import { expect, type Page } from "@playwright/test";
import { resolveSeedSectionId } from "./seed-lookups";

export { resolveSeedSectionId } from "./seed-lookups";

export async function ensureSeedSectionSubscription(page: Page) {
  const sectionId = await resolveSeedSectionId(page);
  const subscriptionResponse = await page.request.post(
    "/api/calendar-subscriptions",
    { data: { sectionIds: [sectionId] } },
  );
  expect(subscriptionResponse.status()).toBe(200);
}
