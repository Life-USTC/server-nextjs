/**
 * E2E tests for /privacy page
 *
 * Static legal page rendering the privacy policy from i18n keys.
 */
import { expect, test } from "@playwright/test";
import {
  gotoAndWaitForReady,
  waitForUiSettled,
} from "../../../utils/page-ready";
import { assertPageContract } from "../_shared/page-contract";

test.describe("/privacy", () => {
  test("contract", async ({ page }, testInfo) => {
    await assertPageContract(page, { routePath: "/privacy", testInfo });
  });

  test("renders privacy policy with sections", async ({ page }, testInfo) => {
    await gotoAndWaitForReady(page, "/privacy", {
      testInfo,
      screenshotLabel: "privacy",
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
