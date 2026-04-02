import { expect, test } from "@playwright/test";
import { signInAsDebugUser } from "../../../../utils/auth";
import { captureStepScreenshot } from "../../../../utils/screenshot";

test.describe.configure({ mode: "serial" });

const PIN_LABEL = /^(?:置顶|Pin)$/i;
const UNPIN_LABEL = /^(?:取消置顶|Unpin)$/i;

test("/?tab=links 未登录可访问公开网站列表", async ({ page }, testInfo) => {
  await page.goto("/?tab=links", { waitUntil: "networkidle" });

  const searchInput = page.getByRole("searchbox", {
    name: /搜索网站名称或描述|Search by name or description/i,
  });
  await expect(searchInput).toBeVisible();
  await expect(
    page.getByRole("button", { name: /教务系统/i }).first(),
  ).toBeVisible();
  await expect(
    page.locator('form[action="/api/dashboard-links/pin"]').first(),
  ).toHaveCount(0);
  await captureStepScreenshot(page, testInfo, "public-dashboard-links-tab");
});

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

test("/?tab=links 可搜索网站并支持快捷键聚焦", async ({ page }, testInfo) => {
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
  await expect(
    page.getByRole("button", { name: /邮箱/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /教务系统/i }).first(),
  ).toHaveCount(0);
  await captureStepScreenshot(page, testInfo, "dashboard-links-search");
});

test("/?tab=links 可置顶并恢复网站", async ({ page }, testInfo) => {
  await signInAsDebugUser(page, "/?tab=links");

  const locatePinButton = async () => {
    const linkButton = page.getByRole("button", { name: /教务系统/i }).first();
    await expect(linkButton).toBeVisible();

    const card = linkButton.locator(
      "xpath=ancestor::div[contains(@class, 'group')][1]",
    );
    await card.hover();

    const pinForm = page
      .locator('form[action="/api/dashboard-links/pin"]')
      .filter({
        has: page.locator('input[name="slug"][value="jw"]'),
      })
      .first();
    const pinButton = pinForm
      .getByRole("button", { name: /置顶|Pin|取消置顶|Unpin/i })
      .first();

    await expect(pinButton).toBeVisible();
    return pinButton;
  };

  const pinButton = await locatePinButton();
  const initialLabel = await pinButton.getAttribute("aria-label");
  expect(initialLabel).toMatch(/^(?:置顶|Pin|取消置顶|Unpin)$/i);
  const togglesToPinned = PIN_LABEL.test(initialLabel ?? "");
  const expectedInitialLabel = togglesToPinned ? PIN_LABEL : UNPIN_LABEL;
  await pinButton.click({ force: true });
  await expect(await locatePinButton()).toHaveAttribute(
    "aria-label",
    togglesToPinned ? UNPIN_LABEL : PIN_LABEL,
  );
  await captureStepScreenshot(page, testInfo, "dashboard-links-toggle-request");

  const restoreResponse = await page.request.post("/api/dashboard-links/pin", {
    form: {
      slug: "jw",
      action: togglesToPinned ? "unpin" : "pin",
      returnTo: "/?tab=links",
    },
    headers: {
      accept: "application/json",
    },
  });
  expect(restoreResponse.status()).toBe(200);

  await page.reload({ waitUntil: "networkidle" });
  await expect(await locatePinButton()).toHaveAttribute(
    "aria-label",
    expectedInitialLabel,
  );
});
