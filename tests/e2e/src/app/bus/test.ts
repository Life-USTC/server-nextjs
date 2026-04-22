/**
 * E2E tests for the bus dashboard tab (/?tab=bus)
 *
 * ## Behavior
 * - /bus page returns 404
 * - Public users get a client-side planner: weekday/weekend, start stop, end stop,
 *   reverse, and departed-trip toggle
 * - Applicable routes are ordered by the next bus available from the selected start stop
 * - Signed-in users have planner defaults auto-saved through /api/bus/preferences
 */
import { expect, type Page, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../utils/auth";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";

async function chooseStop(page: Page, label: RegExp, option: RegExp) {
  const group =
    label.source.includes("Start") || label.source.includes("出发")
      ? page.locator("[data-testid='bus-start-stop-group']")
      : page.locator("[data-testid='bus-end-stop-group']");
  await group.getByRole("button", { name: option }).click();
}

function routeSectionRows(page: Page) {
  return page.locator("section").filter({
    has: page.getByText(/total trips|共 .* 班/),
  });
}

test.describe("bus dashboard tab", () => {
  test("/bus returns 404 (redirect removed)", async ({ page }) => {
    const response = await page.goto("/bus");
    expect(response?.status()).toBe(404);
  });

  test("public bus tab shows the planner controls", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    await expect(
      page.getByRole("button", { name: /Weekday|工作日/ }).first(),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='bus-start-stop-group']"),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='bus-end-stop-group']"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reverse|反向/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Show departed trips|显示已发车班次/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Transit map|线路图/ }),
    ).toHaveAttribute("href", "/bus-map");

    await captureStepScreenshot(page, testInfo, "bus-planner-public");
  });

  test("default stop pair shows every applicable route ordered by next available bus", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    await expect(routeSectionRows(page)).toHaveCount(2);
    await expect(routeSectionRows(page).first()).toContainText(
      "东区 -> 北区 -> 西区",
    );
    await expect(routeSectionRows(page).nth(1)).toContainText(
      "东区 -> 西区 -> 先研院 -> 高新",
    );
  });

  test("reverse swaps direction and recomputes applicable routes", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    await page.getByRole("button", { name: /Reverse|反向/ }).click();

    await expect(routeSectionRows(page)).toHaveCount(1);
    await expect(routeSectionRows(page).first()).toContainText(
      "高新 -> 先研院 -> 西区 -> 东区",
    );

    await captureStepScreenshot(page, testInfo, "bus-planner-reverse");
  });

  test("selecting 东区 to 南区 narrows the list to the direct route", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    await chooseStop(page, /End stop|到达站/, /南区/);

    await expect(routeSectionRows(page)).toHaveCount(1);
    await expect(routeSectionRows(page).first()).toContainText("东区 -> 南区");
    await expect(page.locator("table")).toContainText("南区");
  });

  test("departed toggle keeps the timetable visible and switchable", async ({
    page,
  }) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    const initialRows = await page.locator("tbody tr").count();
    const departedToggle = page.getByRole("button", {
      name: /Show departed trips|显示已发车班次/,
    });
    await departedToggle.click();
    await expect(page.locator("table").first()).toBeVisible();
    const expandedRows = await page.locator("tbody tr").count();
    expect(expandedRows).toBeGreaterThanOrEqual(initialRows);

    await departedToggle.click();
    await expect(page.locator("table").first()).toBeVisible();
  });

  test("weekday/weekend toggle updates the selected route timetable", async ({
    page,
  }, testInfo) => {
    await gotoAndWaitForReady(page, "/?tab=bus");

    await page
      .getByRole("button", { name: /Weekday|工作日/ })
      .first()
      .click();
    await expect(page.getByText(/4 total trips|共 4 班/).first()).toBeVisible();

    await page
      .getByRole("button", { name: /Weekend|周末/ })
      .first()
      .click();
    await expect(page.getByText(/3 total trips|共 3 班/).first()).toBeVisible();

    await captureStepScreenshot(page, testInfo, "bus-planner-daytype");
  });

  test("signed-in planner changes auto-save to bus preferences", async ({
    page,
  }, testInfo) => {
    await signInAsDebugUser(page, "/?tab=bus");

    await expect(page.getByText(/saved automatically|自动保存/)).toBeVisible();

    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/bus/preferences") &&
          response.request().method() === "POST",
      ),
      chooseStop(page, /End stop|到达站/, /南区/),
    ]);
    expect(saveResponse.ok()).toBe(true);

    await expect(page.getByText(/saved|已保存/i).first()).toBeVisible();

    const response = await page.request.get("/api/bus/preferences");
    const body = (await response.json()) as {
      preference?: {
        preferredOriginCampusId?: number | null;
        preferredDestinationCampusId?: number | null;
      };
    };
    expect(body.preference?.preferredOriginCampusId).toBe(1);
    expect(body.preference?.preferredDestinationCampusId).toBe(4);

    await page.request.post("/api/bus/preferences", {
      data: {
        preferredOriginCampusId: null,
        preferredDestinationCampusId: null,
        showDepartedTrips: false,
      },
    });

    await captureStepScreenshot(page, testInfo, "bus-planner-autosave");
  });
});
