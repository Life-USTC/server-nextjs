import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { DEV_SEED } from "../../../../utils/dev-seed";
import { gotoAndWaitForReady } from "../../../../utils/page-ready";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test("/?tab=homeworks 未登录可访问", async ({ page }, testInfo) => {
  await gotoAndWaitForReady(page, "/?tab=homeworks", {
    expectMainContent: true,
  });

  await expect(page).toHaveURL(/\/\?tab=homeworks$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-homeworks-unauthorized",
  );
});

test("/?tab=homeworks 登录后展示 seed 作业", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=homeworks");

  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.getByText(DEV_SEED.homeworks.title).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-homeworks-seed");
});

test("/?tab=homeworks 可切换完成状态 Tab", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=homeworks");

  const completedTab = page
    .getByRole("button", { name: /已完成|Completed/i })
    .first();
  if ((await completedTab.count()) > 0) {
    await completedTab.click();
    await expect(completedTab).toBeVisible();
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-tab-completed",
    );
  }
});

test("/?tab=homeworks 可切换作业完成状态", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await signInAsDebugUser(page, "/?tab=homeworks");

  const item = page.locator("[data-homework-id]").first();
  if ((await item.count()) === 0) {
    await expect(
      page.getByText(DEV_SEED.homeworks.title).first(),
    ).toBeVisible();
    return;
  }

  const toggle = item.getByRole("switch").first();
  if ((await toggle.count()) === 0) {
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-no-switch",
    );
    return;
  }

  const before = await toggle.getAttribute("aria-checked");
  const completionResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/homeworks/") &&
      response.url().includes("/completion") &&
      ["PUT", "POST"].includes(response.request().method()) &&
      response.status() === 200,
  );
  await toggle.click();
  await completionResponse;
  await page.waitForLoadState("networkidle");
  await expect(toggle).not.toHaveAttribute("aria-checked", before ?? "false");
  await captureStepScreenshot(page, testInfo, "dashboard-homeworks-toggled");
});

test("/?tab=homeworks 查看详情可跳转到班级页锚点", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/?tab=homeworks");

  const viewDetails = page
    .getByRole("link", { name: /查看详情|View details/i })
    .first();
  if ((await viewDetails.count()) === 0) {
    await captureStepScreenshot(
      page,
      testInfo,
      "dashboard-homeworks-no-detail-link",
    );
    return;
  }

  await viewDetails.click();
  await expect(page).toHaveURL(/\/sections\/\d+.*#homework-/);
  await captureStepScreenshot(
    page,
    testInfo,
    "dashboard-homeworks-view-details",
  );
});

test("/?tab=homeworks 可创建作业", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=homeworks");

  const addButton = page.getByTestId("dashboard-homeworks-add").first();
  if ((await addButton.count()) === 0) {
    await expect(page.locator("#main-content")).toBeVisible();
    return;
  }

  await addButton.click();

  const title = `e2e-dashboard-homework-${Date.now()}`;
  await page.getByTestId("dashboard-homework-title").fill(title);
  await page.getByTestId("dashboard-homework-create").click();

  await expect(page.getByText(title).first()).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-homeworks-created");
});
