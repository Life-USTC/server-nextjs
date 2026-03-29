import { expect, test } from "@playwright/test";
import { gotoAndWaitForReady } from "../../../utils/page-ready";
import { captureStepScreenshot } from "../../../utils/screenshot";
import { assertPageContract } from "../_shared/page-contract";

test("/bus-schedule 页面可访问", async ({ page }, testInfo) => {
  await assertPageContract(page, { routePath: "/bus-schedule", testInfo });
});

test("/bus-schedule 校车时刻表显示正确", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus-schedule");

  await expect(
    page.getByRole("heading", { name: /校车时刻表|Campus Shuttle/i }),
  ).toBeVisible();

  // Verify weekday/weekend toggles exist
  await expect(
    page.getByRole("button", { name: /工作日|Weekday/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /周末|Weekend/i }),
  ).toBeVisible();

  // Verify stop filter buttons exist
  await expect(
    page.getByRole("button", { name: /全部站点|All Stops/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "东区" })).toBeVisible();
  await expect(page.getByRole("button", { name: "西区" })).toBeVisible();

  // Verify route tables are displayed
  await expect(page.getByText(/Route 1|线路 1/i).first()).toBeVisible();

  // Verify time data is present
  await expect(page.getByText("07:30").first()).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-schedule-weekday");
});

test("/bus-schedule 周末切换", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus-schedule");

  const weekendButton = page.getByRole("button", {
    name: /周末|Weekend/i,
  });
  await weekendButton.click();

  // Verify the weekend schedule is shown (weekend has fewer trips)
  await expect(page.getByText(/Route 1|线路 1/i).first()).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-schedule-weekend");
});

test("/bus-schedule 站点筛选", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/bus-schedule");

  // Click on 南区 filter
  await page.getByRole("button", { name: "南区" }).click();

  // Routes 3 and 4 connect to 南区, routes 1 and 2 do not
  await expect(page.getByText(/Route 3|线路 3/i).first()).toBeVisible();
  await expect(page.getByText(/Route 4|线路 4/i).first()).toBeVisible();

  await captureStepScreenshot(page, testInfo, "bus-schedule-filter-south");
});

test("/api/bus-schedules 返回数据", async ({ page }) => {
  const response = await page.request.get("/api/bus-schedules");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    config?: {
      id?: number;
      name?: string;
      stops?: Array<{ name?: string }>;
      routes?: Array<{ routeNumber?: number }>;
    };
  };

  expect(body.config).toBeTruthy();
  expect(body.config?.stops?.length).toBeGreaterThanOrEqual(6);
  expect(body.config?.routes?.length).toBeGreaterThanOrEqual(1);
});
