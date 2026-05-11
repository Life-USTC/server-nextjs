/**
 * E2E tests for /terms page
 *
 * Static legal page rendering the terms of service from i18n keys.
 */
import { expect, test } from "@playwright/test";
import {
  gotoAndWaitForReady,
  waitForUiSettled,
} from "../../../utils/page-ready";
import { assertPageContract } from "../_shared/page-contract";

test.describe("/terms", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/terms", testInfo });
  });

  test("renders terms of service with sections", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/terms", {
      testInfo,
      screenshotLabel: "terms",
    });
    await waitForUiSettled(page);

    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();

    const sections = page.locator("h2");
    await expect(sections.first()).toBeVisible();
    expect(await sections.count()).toBeGreaterThan(0);

    const listItems = page.locator("li");
    expect(await listItems.count()).toBeGreaterThan(0);
  });
});
