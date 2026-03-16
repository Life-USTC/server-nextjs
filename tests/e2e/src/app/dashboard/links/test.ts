import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

test("/ 可点击网站 Tab 进入 links 页面", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/");

  const linksTab = page.getByRole("link", { name: /网站|Websites/i }).first();
  await expect(linksTab).toBeVisible();
  await linksTab.click();

  await expect(page).toHaveURL(/\/\?tab=links$/);
  await expect(
    page.getByRole("searchbox", {
      name: /搜索网站名称或描述|Search by name or description/i,
    }),
  ).toBeVisible();
  await captureStepScreenshot(page, testInfo, "dashboard-links-tab");
});

test("/?tab=links 可搜索网站并支持快捷键聚焦", async ({
  page,
}, testInfo) => {
  await signInAsDebugUser(page, "/?tab=links");

  const searchInput = page.getByRole("searchbox", {
    name: /搜索网站名称或描述|Search by name or description/i,
  });
  await expect(searchInput).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );
  });
  await expect(searchInput).toBeFocused();

  await searchInput.fill("邮箱");
  await expect(page.getByRole("button", { name: /邮箱/i }).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /教务系统/i }).first(),
  ).toHaveCount(0);
  await captureStepScreenshot(page, testInfo, "dashboard-links-search");
});

test("/?tab=links 可置顶并恢复网站", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=links");

  const linkButton = page.getByRole("button", { name: /教务系统/i }).first();
  await expect(linkButton).toBeVisible();

  const card = page.locator("div").filter({ has: linkButton }).first();
  await card.hover();

  const pinButton = card
    .getByRole("button", { name: /置顶|Pin|取消置顶|Unpin/i })
    .first();
  await expect(pinButton).toBeVisible();

  const initialLabel = await pinButton.getAttribute("aria-label");
  const pinResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/dashboard-links/pin") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await pinButton.click({ force: true });
  await pinResponse;

  const toggledLabel = await pinButton.getAttribute("aria-label");
  expect(toggledLabel).not.toBe(initialLabel);
  await captureStepScreenshot(page, testInfo, "dashboard-links-pinned");

  const unpinResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/dashboard-links/pin") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await pinButton.click({ force: true });
  await unpinResponse;
  await expect(pinButton).toHaveAttribute("aria-label", initialLabel ?? "");
});
